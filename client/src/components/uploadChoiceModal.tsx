import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "./file-upload-zone";
import { useUser } from "@/context/userContext";

interface UploadChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCleanUpload: (file: File) => void;
}

export function UploadChoiceModal({
  open,
  onClose,
  onCleanUpload,
}: UploadChoiceModalProps) {
  const [mode, setMode] = useState<"clean" | null>(null);
  const { user, openAuthModal, incrementUploads } = useUser();

  useEffect(() => {
    if (!open) setMode(null);
  }, [open]);

  // 🔐 Auth check
  useEffect(() => {
    if (open && !user) {
      openAuthModal();
      onClose();
    }
  }, [open, user, openAuthModal, onClose]);

  
 // 🚫 Beta access check (runs only once per open)
// useEffect(() => {
//   if (!open || !user) return;

//   if (!user.beta_access) {
//     toast({
//       title: "🔒 Beta access required",
//       description: "Please verify your beta code to upload files.",
//       variant: "destructive",
//     });
//     onClose();
//   }
// }, [open]); // 🔥 FIX HERE


  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl">
        {!mode && (
          <div className="flex flex-col items-center space-y-6">
            <DialogHeader>
              <DialogTitle>Select Upload Mode</DialogTitle>
            </DialogHeader>

            <Button onClick={() => setMode("clean")} className="w-40">
              Clean messy data
            </Button>
          </div>
        )}

        {mode === "clean" && (
          <FileUploadZone
            onFileUpload={(file) => {
              onCleanUpload(file);
              incrementUploads();
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
