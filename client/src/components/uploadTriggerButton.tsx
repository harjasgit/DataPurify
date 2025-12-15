import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadChoiceModal } from "./uploadChoiceModal";

type UploadTriggerButtonProps = {
  onCleanUpload: (data: any) => void;
  open?: boolean;                         // 👈 allow external control
  onOpenChange?: (open: boolean) => void; 
  onRecordLinkageUpload: (fileA: File, fileB: File) => void;
};

export function UploadTriggerButton({
  onCleanUpload,
  onOpenChange
}: UploadTriggerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Upload Data
      </Button>
      <UploadChoiceModal
        open={open}
        onClose={() => setOpen(false)}
        onCleanUpload={onCleanUpload}
              />
    </>
  );
}
