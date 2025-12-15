import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  onClose?: () => void;
  user?: { id: string; email: string };
}

export function FileUploadZone({ onFileUpload, user }: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  // ------------------ ON DROP ------------------
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        const reason = fileRejections[0].errors[0];

        if (reason.code === "file-too-large") {
          toast({
            title: "⚠️ File too large",
            description: "Max allowed size: 20MB.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Upload Error",
          description: reason.message,
          variant: "destructive",
        });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_SIZE) {
        toast({
          title: "⚠️ File too large",
          description: "Max allowed size: 20MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    },
    [toast]
  );

  // Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
    noClick: !!selectedFile,
  });

  // ------------------ UPLOAD CLICK ------------------
  const handleClickUpload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please choose a file first.",
        variant: "destructive",
      });
      open();
      return;
    }

    setIsUploading(true);
    try {
      await onFileUpload(selectedFile);

      toast({
        title: "✅ Upload Successful",
        description: "Your file has been processed.",
      });
      
       // 2️⃣ Notify backend → FIRST UPLOAD (feedback trigger)
      if (user) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/post-first-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      email: user.email,
    }),
  });

  const json = await res.json();
  console.log("Feedback response:", json);

  if (res.ok && json.message === "Feedback email sent") {
    toast({
      title: "📬 Feedback email sent",
      description: "Check your inbox (or spam).",
    });
  }
}      
 setSelectedFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload Failed",
        description: "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div
          {...getRootProps()}
          className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-primary/5"
          } ${isUploading ? "opacity-70 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />

          <div className="mb-4">
            {isUploading ? (
              <Loader2 className="mx-auto h-16 w-16 animate-spin" />
            ) : (
              <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {isUploading ? "Processing..." : "Upload your data file"}
          </h3>

          <p className="text-muted-foreground mb-4">
            {isUploading
              ? "Analyzing your file..."
              : "Drag & drop CSV/XLSX here or click to browse."}
          </p>
          <p>Max file size: 20MB</p>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleClickUpload} disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading
                ? "Processing..."
                : selectedFile
                ? `Upload ${selectedFile.name}`
                : "Choose File"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
