import express, { Request, Response } from "express";
import Busboy from "busboy";
import type { Readable } from "stream";
import { recordLinkageStorage } from "../server/config/supabaseClient.js";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import path from "path";
import { Worker } from "worker_threads";

const router = express.Router();

/* -------------------- FILE UPLOAD & PARSE -------------------- */
router.post("/api/upload/record-linkage", async (req: Request, res: Response) => {
  try {
    const bb = Busboy({ headers: req.headers });
    const files: { fieldname: string; filename: string; buffer: Buffer }[] = [];
     
    bb.on("file", (fieldname: string, file: Readable, info: any) => {
      const chunks: Buffer[] = [];
      file.on("data", (data: Buffer) => chunks.push(data));
      file.on("end", () =>
        files.push({ fieldname, filename: info.filename, buffer: Buffer.concat(chunks) })
      );
    });

    bb.on("finish", async () => {
      if (files.length < 2)
        return res.status(400).json({ error: "Please upload both files" });

      const fileA = files.find(f => f.fieldname === "fileA");
      const fileB = files.find(f => f.fieldname === "fileB");

      if (!fileA || !fileB)
        return res.status(400).json({ error: "Both fileA and fileB are required" });

      // ✅ Universal parser (CSV / XLSX)
      const parseFile = (file: { filename: string; buffer: Buffer }) => {
        if (file.filename.endsWith(".csv")) {
          const csv = file.buffer.toString("utf-8");
          return Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
        } else {
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }
      };

      const fileAData = parseFile(fileA);
      const fileBData = parseFile(fileB);

      // ✅ Upload both files to Supabase storage
      const storeFile = async (file: { filename: string; buffer: Buffer }) => {
        const path = `uploads/${Date.now()}-${file.filename}`;
        const { error } = await recordLinkageStorage.supabase.storage
          .from("recordlinkage")
          .upload(path, file.buffer, {
            contentType: "application/octet-stream",
            upsert: true,
          });
        if (error) throw error;

        const { data } = recordLinkageStorage.supabase.storage
          .from("recordlinkage")
          .getPublicUrl(path);
        return data.publicUrl;
      };

      const [fileAUrl, fileBUrl] = await Promise.all([
        storeFile(fileA),
        storeFile(fileB),
      ]);

      const inserted = await recordLinkageStorage.createRecordLinkageFile({
        file_a_name: fileA.filename,
        file_a_path: fileAUrl,
        file_a_data: fileAData,
        file_b_name: fileB.filename,
        file_b_path: fileBUrl,
        file_b_data: fileBData,
        status: "uploaded",
      });

      res.status(200).json({
        success: true,
        record_linkage_id: inserted.id,
        message: "✅ Files uploaded and parsed successfully!",
      });
    });

    req.pipe(bb);
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: String(err) });
  }
});

/* -------------------- FETCH RECORD BY ID -------------------- */
router.get("/api/record-linkage/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await recordLinkageStorage.getRecordLinkageById(id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    res.status(200).json({
      fileAData: record.file_a_data || [],
      fileBData: record.file_b_data || [],
    });
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch record data" });
  }
});

/* -------------------- RUN RECORD LINKAGE -------------------- */
router.post("/api/record-linkage/run", async (req: Request, res: Response) => {
  try {
    const { id, mapping, mode = "basic" } = req.body;

    if (!id || !mapping)
      return res.status(400).json({ error: "Record ID & mapping required" });

    const record = await recordLinkageStorage.getRecordLinkageById(id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    const fileAData = record.file_a_data || [];
    const fileBData = record.file_b_data || [];

    const workerPath = path.resolve("worker/recordLinkWorker.ts");

    const worker = new Worker(workerPath, {
      workerData: { fileAData, fileBData, mapping, mode },
    });

    worker.on("message", async (result) => {
      await recordLinkageStorage.supabase
        .from("record_linkage_files")
        .update({
          status: "linked",
          summary: result.summary,
          matches_preview: result.exact.slice(0, 5),
        })
        .eq("id", id);

      return res.status(200).json({
        success: true,
        ...result,
        message: "Record linkage completed via worker",
      });
    });

    worker.on("error", (err) => {
      console.error("Worker error:", err);
      return res.status(500).json({ error: "Worker failed", details: err });
    });

  } catch (err) {
    console.error("❌ Worker route error:", err);
    res.status(500).json({ error: "Failed to run record linkage" });
  }
});


export default router;
