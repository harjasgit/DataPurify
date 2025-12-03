// src/components/uploadChoiceModal.tsx
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "./file-upload-zone";
import { RecordLinkageUpload } from "./recordLinkageUpload";
import { useUser } from "@/context/userContext"; // 👈 import user context

interface UploadChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCleanUpload: (file: File) => void;
  onRecordLinkageUpload: (fileA: File, fileB: File) => void;
  onOpenChange?: (open: boolean) => void; 
}

export function UploadChoiceModal({
  open,
  onClose,
  onCleanUpload,
  onRecordLinkageUpload,
  onOpenChange
}: UploadChoiceModalProps) {
  const [mode, setMode] = useState<"clean" | "record" | null>(null);

  // 👇 grab the incrementUploads from user context
  const { user, openAuthModal, incrementUploads } = useUser();

  useEffect(() => {
    if (!open) setMode(null);
  }, [open]);

  // 🧠 intercept if not logged in
  useEffect(() => {
    if (open && !user) {
      openAuthModal();
      onClose();
    }
  }, [open, user, openAuthModal, onClose]);

  return (
    <Dialog
  open={open && !!user}
  onOpenChange={(value) => {
    if (!value) onClose();   // CLOSE only when modal becomes false
  }}
>

      <DialogContent className="max-w-4xl">
        {!mode && (
          <div className="flex flex-col items-center space-y-6">
            <DialogHeader>
              <DialogTitle>Choose Upload Mode</DialogTitle>
            </DialogHeader>

            <div className="flex gap-6">
              <Button onClick={() => setMode("clean")} className="w-40">
                Clean File
              </Button>
              <Button onClick={() => setMode("record")} variant="outline" className="w-40">
                Record Linkage
              </Button>
            </div>
          </div>
        )}

        {mode === "clean" && (
          <FileUploadZone
            onFileUpload={(file) => {
              if (file) {
                console.log("🧾 Clean upload file:", file?.name ?? "undefined");
                onCleanUpload(file);

                // ✅ increment the user's upload count
                incrementUploads();
              }
              onClose();
            }}
              onClose={onClose} 
          />
        )}

        {mode === "record" && (
          <RecordLinkageUpload
            onFilesUpload={({ fileA, fileB }: { fileA?: File; fileB?: File }) => {
              if (fileA && fileB) {
                onRecordLinkageUpload(fileA, fileB);

                // ✅ increment for record linkage as well
                incrementUploads();
              }
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
