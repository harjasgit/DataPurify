import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DataQualityScore } from "./data-quality-score";

interface FileRecord {
  id: string;
  name: string;
  path: ""
  cleanedData?: any[];
  qualityScore?: number;
}

interface FileExportPageProps {
  fileId: string;
}

export default function FileExportPage({ fileId }: FileExportPageProps) {
  const [fileRecord, setFileRecord] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFile() {
      setLoading(true);
      const { data, error } = await supabase
        .from("data_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (error) {
        console.error("Failed to fetch file:", error);
        setFileRecord(null);
      } else {
        setFileRecord({
          id: data.id,
          name: data.filename,
          path: "",
          cleanedData: data.cleaned_data,
          qualityScore: data.quality_score,
        });
      }
      setLoading(false);
    }

    loadFile();
  }, [fileId]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Download Cleaned File</h1>
      {!loading && fileRecord ? (
        <DataQualityScore file={fileRecord} qualityScore={fileRecord.qualityScore} format="csv" />
      ) : (
        <div>Loading file...</div>
      )}
    </div>
  );
}
