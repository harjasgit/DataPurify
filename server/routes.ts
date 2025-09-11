import type { Express } from "express";
import { createServer, type Server } from "http";
import * as XLSX from "xlsx";
import { cleaningOperationSchema, type DataIssue, type CleaningOperation } from "./shared/schema.js";
import { Readable } from "stream";
import Busboy from "busboy";
import { getSupabase } from "./config/supabaseClient.js";
import { z } from "zod";
import { storage } from "./storage.js";
import { parse as fastCsvParse } from "fast-csv";
import ExcelJS from "exceljs";
import * as fs from "fs";

// ---------- Helpers ----------
function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const normalized = val.trim().toLowerCase();
    return (
    normalized === "" ||
      normalized === "-" ||
      normalized === "—" ||  // em dash
      normalized === "–" ||  // en dash
      normalized === "--" ||
      normalized === "n/a" ||
      normalized === "na" ||
      normalized === "null" ||
      normalized === "nil" ||
      normalized === "none"
    );
  }
  return false;
}

async function csvFromBuffer(buffer: Buffer): Promise<any[]> {
  const results: any[] = [];
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    stream
      .pipe(fastCsvParse({ headers: true }))
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// ---------- Data Processing ----------

class DataProcessor {
  // ---------- CSV (fast-csv streaming) ----------
  static parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(filePath)
        .pipe(fastCsvParse({ headers: true, ignoreEmpty: true, trim: true }))
        .on("error", reject)
        .on("data", (row: any) => {
          results.push(row);
        })
        .on("end", (rowCount: number) => {
          console.log(`✅ CSV parsed: ${rowCount} rows`);
          resolve(results);
        });
    });
  }

static async parseExcel(filePath: string): Promise<any[]> {
  const results: any[] = [];
  const workbook = new ExcelJS.Workbook();

  // open in streaming mode
  await workbook.xlsx.readFile(filePath);

  workbook.eachSheet((worksheet) => {
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as any[];
      values.shift(); // remove ExcelJS's dummy index 0

      if (rowNumber === 1) {
        headers = values.map((v) => String(v));
      } else {
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i] ?? null;
        });
        results.push(rowObj);
      }
    });
  });

  console.log(`✅ Excel parsed: ${results.length} rows`);
  return results;
}

  // ---------- Detect Issues ----------
  static detectIssues(data: any[]): DataIssue[] {
    const issues: DataIssue[] = [];
    if (!Array.isArray(data) || data.length === 0) return issues;

    const columns = Object.keys(data[0] ?? {});

    for (const column of columns) {
      const values = data.map((row) => row[column]);

      // 1) EMPTY COLUMN -> highest priority. If every value is empty-like, push only empty_column and skip other checks.
      if (values.every((v) => isEmptyValue(v))) {
        issues.push({
          type: "empty_column",
          column,
          count: data.length,
          description: `"${column}" is completely empty`,
          severity: "warning",
        });
        continue; // important: do not add missing_values/format errors for this column
      }

      // 2) MISSING VALUES (some but not all)
      const missingCount = values.filter((v) => isEmptyValue(v)).length;
      if (missingCount > 0) {
        issues.push({
          type: "missing_values",
          column,
          count: missingCount,
          description: `${missingCount} missing values found in "${column}" column`,
          severity: missingCount > data.length * 0.1 ? "error" : "warning",
        });
      }

      // 3) Date format issues (skip empty cells)
      if (column.toLowerCase().includes("date") || column.toLowerCase().includes("time")) {
        const dateFormats = new Set<string>();
        values.forEach((val) => {
          if (!isEmptyValue(val)) {
            const str = val.toString().trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) dateFormats.add("ISO");
            else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) dateFormats.add("US");
            else if (/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(str)) dateFormats.add("EU");
            else if (/^[A-Za-z]{3}\s\d{1,2},?\s\d{4}$/.test(str)) dateFormats.add("TEXT");
            else if (!isNaN(Number(str))) dateFormats.add("EXCEL_SERIAL");
            else dateFormats.add("UNKNOWN");
          }
        });

        if (dateFormats.size > 1) {
          issues.push({
            type: "date_format",
            column,
            count: data.length,
            description: `Inconsistent date formats in "${column}" column`,
            severity: "warning",
          });
        }
      }

      // 4) Phone format issues (skip empty cells)
      if (column.toLowerCase().includes("phone")) {
        const phoneFormats = new Set<string>();
        values.forEach((val) => {
          if (!isEmptyValue(val)) {
            const str = val.toString().trim();
            if (/^\+1-\d{3}-\d{3}-\d{4}$/.test(str)) phoneFormats.add("STANDARD_US");
            else if (/^\d{3}-\d{3}-\d{4}$/.test(str)) phoneFormats.add("DASHED_US");
            else if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(str)) phoneFormats.add("PARENS_US");
            else if (/^\d{10}$/.test(str)) phoneFormats.add("PLAIN_10");
            else if (/^\d{3}\.\d{3}\.\d{4}$/.test(str)) phoneFormats.add("DOTS_US");
            else if (/^\+?\d{1,3}[-\s]?\d{4,14}$/.test(str)) phoneFormats.add("INTL");
            else phoneFormats.add("OTHER");
          }
        });

        if (phoneFormats.size > 1 || phoneFormats.has("OTHER")) {
          issues.push({
            type: "phone_format",
            column,
            count: data.length,
            description: `Inconsistent or invalid phone formats in "${column}" column`,
            severity: "warning",
          });
        }
      }

      // 5) Email format issues (skip empty cells)
      if (column.toLowerCase().includes("email")) {
        let invalidEmails = 0;
        values.forEach((val) => {
          if (!isEmptyValue(val)) {
            const str = val.toString().trim();
            const email = str.toLowerCase();
            const basicPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
            if (
              !basicPattern.test(email) ||
              email.includes("..") ||
              email.includes(" ") ||
              email.startsWith(".") ||
              email.endsWith(".") ||
              (email.match(/@/g) || []).length !== 1
            ) {
              invalidEmails++;
            }
          }
        });

        if (invalidEmails > 0) {
          issues.push({
            type: "email_format",
            column,
            count: invalidEmails,
            description: `${invalidEmails} invalid or inconsistent email addresses in "${column}" column`,
            severity: "error",
          });
        }
      }
    } // end for columns

   // Detect duplicate rows (keeping first, flagging others)
const seen = new Set<string>();
let duplicateCount = 0;

data.forEach((row) => {
  const key = JSON.stringify(row); // full-row comparison
  if (seen.has(key)) {
    duplicateCount++; // count only later occurrences
  } else {
    seen.add(key);
  }
});

if (duplicateCount > 0) {
  issues.push({
    type: "duplicates",
    column: "all",
    count: duplicateCount,
    description: `${duplicateCount} duplicate row${duplicateCount > 1 ? "s" : ""} found (excluding first occurrence)`,
    severity: "warning",
  });
}
    return issues;
  }


  // ---------- Quality Score ----------
static calculateQualityScore(data: any[], issues: DataIssue[]): number {
  if (!Array.isArray(data) || data.length === 0) return 0;

  const rows = data.length;
  const cols = Object.keys(data[0] || {}).length;
  const totalCells = rows * cols;

  if (totalCells === 0) return 0;

  // Weighted affected cells (only unresolved)
  let affected = 0;

  for (const issue of issues) {
    const weight = issue.severity === "error" ? 2 : 1;
    affected += issue.count * weight;
  }

  // Normalize
  const ratio = affected / (totalCells * 2); // denominator accounts for weights
  const score = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));

  return score;
}



  // ---------- Cleaning ----------
  static applyCleaningOperation(data: any[], operation: CleaningOperation): any[] {
    // Defensive: ensure we have an array
    if (!Array.isArray(data)) {
      throw new TypeError("applyCleaningOperation expected an array as `data`");
    }
                                                           
    switch (operation.type) {
      case "remove_duplicates": {
        const seen = new Set();
        return data.filter((row) => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      case "fill_missing": {
        if (!operation.column) return data;
        if (operation.method === "forward_backward") {
          const filled = [...data];
          for (let i = 1; i < filled.length; i++) {
            if (isEmptyValue(filled[i][operation.column]))
              filled[i][operation.column] = filled[i - 1][operation.column];
          }
          for (let i = filled.length - 2; i >= 0; i--) {
            if (isEmptyValue(filled[i][operation.column]))
              filled[i][operation.column] = filled[i + 1][operation.column];
          }
          return filled;
        }
        if (operation.method === "delete") {
          return data.filter((row) => !isEmptyValue(row[operation.column!]));
        }
        return data;
      }

     case "standardize_dates": {
  if (!operation.column) return data;

  const column = operation.column;

  // ✅ Arrow function instead of function declaration
  const excelSerialToDate = (serial: number): Date => {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + serial * 86400000);
  };

  return data.map((row: Record<string, any>) => {
    if (!isEmptyValue(row[column])) {
      let val = row[column].toString().trim();
      let date: Date | null = null;

      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split("-").map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
      } else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(val)) {
        const [y, m, d] = val.split("/").map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split("/").map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
      } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(val)) {
        const [m, d, y] = val.split("-").map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
      } else if (!isNaN(Number(val))) {
        const serial = Number(val);
        const tmp = excelSerialToDate(serial);
        if (!isNaN(tmp.getTime())) date = tmp; // ✅ Excel serial handled
      } else {
        const parsed = Date.parse(val);
        if (!isNaN(parsed)) {
          const tmp = new Date(parsed);
          date = new Date(Date.UTC(tmp.getFullYear(), tmp.getMonth(), tmp.getDate()));
        }
      }

      if (date && !isNaN(date.getTime())) {
        row[column] = date.toISOString().split("T")[0]; // ✅ Standardized
      }
    }
    return row;
  });
}

case "standardize_phones": {
  if (!operation.column) return data;
  const column = operation.column;

  return data.map((row: Record<string, any>) => {
    const value = row[column];
    if (!isEmptyValue(value)) {
      // Extract only digits
      let digits = value.toString().replace(/\D/g, "");

      // If it starts with 0 (common in many countries), drop it
      if (digits.startsWith("0") && digits.length > 1) {
        digits = digits.replace(/^0+/, "");
      }

      // US default (10-digit → +1xxxxxxxxxx)
      if (digits.length === 10) {
        row[column] = `+1${digits}`;
      }
      // International valid range (11–15 digits → assume full E.164)
      else if (digits.length >= 11 && digits.length <= 15) {
        row[column] = `+${digits}`;
      }
      // Too short → just keep digits (unfixable automatically)
      else {
        row[column] = digits || value.toString();
      }
    }
    return row;
  });
}

case "standardize_emails": {
  if (!operation.column) return data;
  const column = operation.column;

  return data.map((row: Record<string, any>) => {
    const value = row[column];
    if (!isEmptyValue(value)) {
      let email = value.toString().trim().toLowerCase();

      // Remove spaces
      email = email.replace(/\s+/g, "");

      // Collapse consecutive dots in local & domain parts
      email = email.replace(/\.{2,}/g, ".");

      // Remove leading/trailing dots around @ parts
      if (email.startsWith(".")) email = email.slice(1);
      if (email.endsWith(".")) email = email.slice(0, -1);
      email = email.replace(/@\.|\.@/g, "@"); // fix cases like "user@.domain" or "user.@domain"

      // Validate structure again
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

      if (emailRegex.test(email)) {
        row[column] = email;
      } else {
        row[column] = "invalid_email"; // fallback if unfixable
      }
    }
    return row;
  });
}

  case "remove_empty_column": {
  if (!data.length) return data;

  const targetColumn = (operation as any).column as string | undefined;
  let emptyCols: string[] = [];

  if (targetColumn) {
    // If target column exists, check if it's fully empty
    if (Object.prototype.hasOwnProperty.call(data[0], targetColumn)) {
      const isTargetEmpty = data.every((row) => isEmptyValue(row[targetColumn]));
      if (isTargetEmpty) emptyCols = [targetColumn];
      else return data; // Column isn't fully empty, so no-op
    } else {
      return data; // Column doesn't exist, nothing to do
    }
  } else {
    // Remove all fully empty columns
    emptyCols = Object.keys(data[0]).filter((col) =>
      data.every((row) => isEmptyValue(row[col]))
    );
    if (emptyCols.length === 0) return data; // nothing to remove
  }

  return data.map((row) => {
    const newRow = { ...row };
    emptyCols.forEach((col) => delete newRow[col]);
    return newRow;
  });
}
      case "remove_duplicates": {
  const seen = new Set<string>();

  return data.filter((row) => {
    const key = JSON.stringify(row); // compare full row
    if (seen.has(key)) {
      return false; // duplicate → remove
    }
    seen.add(key);
    return true; // first occurrence → keep
  });
}
  }
}

}

// ---------- Routes ----------
export async function registerRoutes(app: Express): Promise<Server> {
  // ---- UPLOAD FILE ----
  app.post("/api/upload", async (req, res) => {
    try {
      const bb = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let filename = "";
      let mimetype = "";

      bb.on("file", (_name: string, file: NodeJS.ReadableStream, info: Busboy.FileInfo) => {
        filename = info.filename;
        mimetype = info.mimeType;
        const chunks: Buffer[] = [];
        file.on("data", (d: Buffer) => chunks.push(d));
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      bb.on("finish", async () => {
        if (!fileBuffer) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Upload raw file to Supabase storage
        const storedPath = `uploads/${Date.now()}-${filename}`;
        const { error: uploadErr } = await getSupabase().storage
          .from("uploads")
          .upload(storedPath, fileBuffer!, { contentType: mimetype, upsert: true });
        if (uploadErr) throw uploadErr;

        // Parse data in-memory
        let data: any[] = [];
        if (mimetype === "text/csv" || filename.toLowerCase().endsWith(".csv")) {
          data = await csvFromBuffer(fileBuffer!);
        } else if (
          mimetype.includes("excel") ||
          mimetype.includes("spreadsheetml") ||
          /\.(xlsx|xls)$/i.test(filename)
        ) {
  // ----- ExcelJS Parsing -----
const workbook = new ExcelJS.Workbook();
const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

// ✅ Load the workbook from buffer
await (workbook.xlsx as any).load(buffer);

// ✅ Grab first sheet safely
const worksheet = workbook.worksheets[0];
if (!worksheet) {
  return res.status(400).json({ message: "Excel file has no sheets" });
}

// ✅ Extract headers
const headerRow = worksheet.getRow(1);
const headers = (headerRow.values as (string | undefined)[]).slice(1) as string[];

// ✅ Extract rows
worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) return; // skip header

  const rowObj: Record<string, any> = {};

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = headers[colNumber - 1];
    if (!header) return;

    let val = cell.value;

    // 🔑 If Excel gives hyperlink object → extract the text
    if (val && typeof val === "object") {
      if ("text" in val) {
        val = (val as any).text;
      } else if ("richText" in val) {
        val = (val as any).richText.map((t: any) => t.text).join("");
      }
    }

    // ✅ Keep email as it appears in Excel (no forced lowercase/trim unless you want)
    rowObj[header] = val ?? null;
  });

  data.push(rowObj);
});

  } else {
    return res.status(400).json({ message: "Unsupported file type" });
  }


        // Run quality checks
        const issues = DataProcessor.detectIssues(data);
        const qualityScore = DataProcessor.calculateQualityScore(data, issues);

        // Save metadata in DB (storage abstraction)
        // IMPORTANT: save both originalData and cleanedData (initially same) so preview is always available
        const dataFile = await storage.createDataFile({
          filename,
          mimetype,
          originalData: data,
          cleanedData: data,
          qualityScore,
          issues,
        });

        return res.json({
          id: dataFile.id,
          filename: dataFile.filename,
          rowCount: data.length,
          qualityScore,
          issues,
          preview: data.slice(0, 100),
        });
      });

      req.pipe(bb);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to process file", error: String(err) });
    }
  });

  // ---- GET FILE ----
  app.get("/api/files/:id", async (req, res) => {
    try {
      const dataFile = await storage.getDataFile(req.params.id);
      if (!dataFile) return res.status(404).json({ message: "File not found" });

      // Prefer cleanedData if available, otherwise fall back to originalData
      const previewData: any[] =
        (dataFile.cleanedData as any[]) ||
        (dataFile.originalData as any[]) ||
        [];

      res.json({
        id: dataFile.id,
        filename: dataFile.filename,
        qualityScore: dataFile.qualityScore,
        issues: dataFile.issues,
        preview: previewData.slice(0, 100),
        rowCount: previewData.length,
      });
    } catch (err) {
      console.error("Get file error:", err);
      res.status(500).json({ message: "Failed to retrieve file", error: String(err) });
    }
  });

// ---- CLEAN (Live Preview) ----
app.post("/api/files/:id/clean", async (req, res) => {
  try {
    const fileId = req.params.id;

    // validate operation(s) with your existing schema
    const body = req.body ?? {};
    const operations: CleaningOperation[] = Array.isArray(body.operations)
      ? z.array(cleaningOperationSchema).parse(body.operations)
      : body.operation
      ? [cleaningOperationSchema.parse(body.operation)]
      : [];

    if (operations.length === 0) {
      return res.status(400).json({ message: "No operations provided" });
    }

    // 1) fetch file metadata & data
    const dataFile = await storage.getDataFile(fileId);
    if (!dataFile) {
      return res.status(404).json({ message: "File not found" });
    }

    // handle both snake_case (DB) and camelCase (TS)
    const workingData: any[] =
      // @ts-ignore
      (dataFile.cleanedData ?? dataFile.cleaned_data ??
       // @ts-ignore
       dataFile.originalData ?? dataFile.original_data ?? []) as any[];

    if (!Array.isArray(workingData)) {
      return res.status(400).json({ message: "Stored data is not an array" });
    }

    // detect issues BEFORE cleaning
    const issuesBefore = DataProcessor.detectIssues(workingData);
    const totalBefore = Array.isArray(issuesBefore)
      ? issuesBefore.length
      : Object.values(issuesBefore).reduce((sum: number, arr: any) => sum + arr.length, 0);

    // 2) apply cleaning operations
    let cleaned = [...workingData];
    for (const op of operations) {
      cleaned = DataProcessor.applyCleaningOperation(cleaned, op);
    }

    // detect issues AFTER cleaning
    const issuesAfter = DataProcessor.detectIssues(cleaned);
    const totalAfter = Array.isArray(issuesAfter)
      ? issuesAfter.length
      : Object.values(issuesAfter).reduce((sum: number, arr: any) => sum + arr.length, 0);

    // 3) compute quality score
    const qualityScore = DataProcessor.calculateQualityScore(cleaned, issuesAfter);

  // ✅ persist cleaned state
   await storage.updateDataFile(fileId, {
   cleanedData: cleaned,
  qualityScore,
  issues: issuesAfter,
  });

    // 4) compute cleaning progress
    const fixed = totalBefore - totalAfter;
    const progress = totalBefore > 0 ? fixed / totalBefore : 1;

    // 5) return preview only (do not persist)
    const preview = cleaned.slice(0, 100);

    return res.json({
      id: dataFile.id,
      filename: dataFile.filename,
      preview,
      rowCount: cleaned.length,
      issues: issuesAfter,
      qualityScore,
      cleaningProgress: {
        fixed,
        total: totalBefore,
        display: `${fixed}/${totalBefore}`, // <-- nice display for frontend
        progress,                           // ratio 0 → 1
      },
    });
  } catch (err) {
    console.error("Error in /api/files/:id/clean:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
// ---- EXPORT FILE ----
app.get("/api/files/:id/export", async (req, res) => {
  try {
    const format = (req.query.format as string)?.toLowerCase() || "csv";
    const fileId = req.params.id;

    console.log("📤 Export request received", { fileId, format });

    // Fetch file record from storage
    const dataFileRaw = await storage.getDataFile(fileId);
    if (!dataFileRaw) {
      return res.status(404).json({ message: "File not found" });
    }

    // Map snake_case → camelCase
    const dataFile = {
      ...dataFileRaw,
      cleanedData: dataFileRaw.cleanedData ?? [],
      originalData: dataFileRaw.originalData ?? [],
    };

    // Prefer cleanedData, fallback to originalData
    const data: Record<string, any>[] =
      Array.isArray(dataFile.cleanedData) && dataFile.cleanedData.length > 0
        ? dataFile.cleanedData
        : Array.isArray(dataFile.originalData) && dataFile.originalData.length > 0
        ? dataFile.originalData
        : [];

    if (data.length === 0) {
      return res.status(400).json({ message: "No data available for export" });
    }

    // --- Prepare filename ---
    const baseName = (dataFile.filename || `file_${fileId}`).replace(/\.[^/.]+$/, "");
    const outFileName = format === "csv" ? `${baseName}_cleaned.csv` : `${baseName}_cleaned.xlsx`;

    if (format === "csv") {
      // Ensure consistent header order
      const headerKeys = Object.keys(data[0]);
      const header = headerKeys.join(",");
      const csvRows = data.map((row) =>
        headerKeys
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = [header, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${outFileName}"`);
      return res.send(csvContent);
    }

    // --- Excel export ---
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${outFileName}"`);
    return res.send(buffer);
  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).json({ message: "Failed to export data", error: String(err) });
  }
});
return createServer(app);
}