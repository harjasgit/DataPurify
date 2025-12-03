import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/userContext";

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  onClose?: () => void;
}

export function FileUploadZone({ onFileUpload, onClose }: FileUploadZoneProps) {
  const { user, plan, uploads, incrementUploads } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { toast } = useToast();

  // REMOVE local counter — always sync to real uploads
  const localUploads = uploads;

  // ------------------ FILE SIZE LIMITS ------------------
  const MAX_FREE_SIZE = 20 * 1024 * 1024; // 20 MB
  const MAX_PRO_SIZE = 50 * 1024 * 1024;  // 50 MB
  const effectiveMaxSize = plan === "pro" ? MAX_PRO_SIZE : MAX_FREE_SIZE;

  // ------------------ ON DROP ------------------
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setShowUpgrade(false);

      if (fileRejections.length > 0) {
        const reason = fileRejections[0].errors[0];

        if (plan === "free" && reason.code === "file-too-large") {
          setShowUpgrade(true);
          toast({
            title: "⚠️ File too large (Free plan)",
            description: "Upgrade to PRO to upload up to 50MB.",
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

      // Manual size enforcement
      if (plan === "free" && file.size > MAX_FREE_SIZE) {
        setShowUpgrade(true);
        toast({
          title: "⚠️ Free Plan Limit",
          description: "Upgrade to PRO to upload up to 50MB.",
          variant: "destructive",
        });
        return;
      }

      if (plan === "pro" && file.size > MAX_PRO_SIZE) {
        toast({
          title: "⚠️ File exceeds 50MB limit",
          description: "Please upload a smaller file.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    },
    [plan, toast]
  );

  // Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxSize: effectiveMaxSize,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
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

    // FREE plan → enforce upload limit
    if (plan === "free" && localUploads >= 5) {
      setShowUpgrade(true);
      toast({
        title: "Free Upload Limit Reached",
        description: "You've used all 5 uploads. Upgrade to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      await onFileUpload(selectedFile);

      await incrementUploads(); // real source of truth

      toast({
        title: "✅ Upload Successful",
        description:
          plan === "free"
            ? `You've used ${uploads + 1} of 5 uploads.`
            : "Upload complete.",
      });

      if (plan === "free" && uploads + 1 >= 5) {
        setShowUpgrade(true);
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

  // ------------------ JSX ------------------
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
            ) : showUpgrade ? (
              <Lock className="mx-auto h-16 w-16 text-red-400" />
            ) : (
              <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {isUploading
              ? "Processing..."
              : showUpgrade
              ? "Upgrade to Pro"
              : "Upload your data file"}
          </h3>

          <p className="text-muted-foreground mb-4">
            {showUpgrade
              ? "Your plan limits have been reached."
              : isUploading
              ? "Analyzing your file..."
              : "Drag & drop CSV/XLSX here or click to browse."}
          </p>

          {user && (
            <div className="flex items-center justify-center gap-2 mb-3 text-sm text-muted-foreground">
              <span>
                Plan: <strong className="capitalize text-primary">{plan}</strong>
              </span>
              <span>•</span>

              <span>
                Uploads:{" "}
                <strong className="text-primary">
                  {plan === "pro" ? "Unlimited" : `${localUploads}/5`}
                </strong>
              </span>
            </div>
          )}

          <div className="flex justify-center gap-3">
            {showUpgrade || (plan === "free" && localUploads >= 5) ? (
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.();
                  setTimeout(() => {
                    window.location.href = "/#pricing-section";
                  }, 50);
                }}
              >
                <Lock className="w-4 h-4 mr-2" /> Upgrade to Pro
              </Button>
            ) : (
              <Button size="lg" onClick={handleClickUpload} disabled={isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading
                  ? "Processing..."
                  : selectedFile
                  ? `Upload ${selectedFile.name}`
                  : "Choose File"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
