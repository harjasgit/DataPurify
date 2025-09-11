import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileUpload: (data: any) => void;
}

export function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        onFileUpload(data);
      } catch (error) {
        toast({
          title: "Upload failed",
          description:
            "There was an error uploading your file. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onFileUpload, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxSize: 30 * 1024 * 1024, // 30MB
    multiple: false,
  });

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div
          {...getRootProps()}
          className={`border-4 border-dashed rounded-2xl p-12 text-center transition-colors duration-300 cursor-pointer ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-primary/5"
          }`}
        >
          <input {...getInputProps()} />

          <div className="mb-4">
            <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isUploading ? "Processing..." : "Upload your data file"}
          </h3>

          <p className="text-muted-foreground mb-4">
            {isUploading
              ? "Analyzing your file..."
              : "Drag and drop your CSV or Excel file here, or click to browse"}
          </p>

            <p className="text-sm text-muted-foreground mb-6">
            Supports <span className="font-medium">CSV, XLSX</span> • Max size{" "}
            <span className="font-medium">30MB</span>
          </p>

          <Button disabled={isUploading} size={"lg"}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Processing..." : "Choose File"}
          </Button>
        </div>
      </div>
    </div>
  );
}
