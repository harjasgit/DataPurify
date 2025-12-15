import { useState } from "react";
import { DataPreviewTable } from "@/components/data-preview-table";
import { SuggestionsSidebar } from "@/components/suggestions-sidebar";
import { DataQualityScore } from "@/components/data-quality-score";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import CardsSection from "@/components/cardsSection";
import { useToast } from "@/hooks/use-toast";
import { UploadTriggerButton } from "@/components/uploadTriggerButton";
import { useLocation } from "wouter";
import { PricingSection } from "@/components/paymentCard";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/userContext";
import { useRef } from "react";


/* ---------- Types ---------- */
interface FileData {
  id?: string;
  filename?: string;
  rowCount?: number;
  qualityScore?: number;
  issues?: any[];
  preview?: any[];
  recordA?: any;
  recordB?: any;
  stats?: {
    mean?: number;
    median?: number;
    mode?: number;
    finalOrderedColumns?: string[];
    cleaningSuggestions?: any[];
    dataQualityScore?: number;
  };
}

export default function Home() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [smartPreview, setSmartPreview] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const { user, openAuthModal } = useUser(); // 👈 assuming showAuthModal opens your login/signup
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { plan } = useUser();
  
const videoRef = useRef<HTMLVideoElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ---------- File Upload ---------- */
const handleFileUpload = async (file: File) => {
  try {
    // ✅ Require login first
    if (!user) {
      openAuthModal();
      return;
    }

    if (!file) throw new Error("No file provided");

    const sizeMB = file.size / (1024 * 1024);
    const maxMB = 20; // free plan limit

    if (sizeMB > maxMB) {
      setShowUpgradePrompt(true);
      toast({
        title: "⚠️ File too large",
        description: `Free plan allows up to ${maxMB} MB. Upgrade to Pro for bigger uploads.`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    const res = await fetch(`${API_BASE}/api/upload/clean`, {
      method: "POST",
      body: formData,
    });
   
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) throw new Error(data?.message || res.statusText);

    const firstPreview = data?.preview?.slice(0, 50) || [];
    const columns = Object.keys(firstPreview[0] || {});
    setOriginalOrder(columns);
    setFileData(data);

    toast({
      title: "✅ File uploaded successfully!",
      description: `Analyzed ${data.rowCount ?? "N/A"} rows — quality ${data.qualityScore ?? "N/A"}.`,
    });
  } catch (err: any) {
    console.error("❌ Upload error:", err);
    toast({
      title: "Upload failed",
      description: err?.message || "Something went wrong while uploading your file.",
      variant: "destructive",
    });
  }
};

 /* ---------- Record Linkage Upload ---------- */
const handleRecordLinkageUpload = async (fileA: File, fileB: File) => {
  try {
    // ✅ Require login first
    if (!user) {
      openAuthModal();
      return;
    }

    if (!fileA || !fileB) throw new Error("Both files required");

    const formData = new FormData();
    formData.append("fileA", fileA, fileA.name);
    formData.append("fileB", fileB, fileB.name);

    const res = await fetch(`${API_BASE}/api/upload/record-linkage`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Record linkage upload failed");

    toast({
      title: "✅ Record Linkage uploaded successfully!",
      description: "Both files uploaded — redirecting...",
    });

    const id = data?.record_linkage_id;
    if (id) navigate(`/record-linkage/${id}`);
  } catch (err: any) {
    console.error("Record linkage upload error:", err);
    toast({
      title: "Upload failed",
      description: err?.message || "Error uploading record linkage files.",
      variant: "destructive",
    });
  }
};
  /* ---------- Data Update ---------- */
  const handleDataUpdate = (updatedData: Partial<FileData> & { finalOrderedColumns?: string[] }) => {
    setFileData((prev: any) => {
      if (!prev) return updatedData;

      const newPreview = updatedData.preview || prev.preview;
      const newIssues = updatedData.issues || prev.issues;
      const newQuality = updatedData.qualityScore ?? prev.qualityScore;
      const newOrder =
        updatedData.finalOrderedColumns ??
        (newPreview?.length ? Object.keys(newPreview[0]) : prev.finalOrderedColumns ?? []);

      const reorderedPreview =
        Array.isArray(newPreview) && newOrder.length > 0
          ? newPreview.map((row: any) => {
              const reordered: any = {};
              newOrder.forEach((col: string) => (reordered[col] = row[col]));
              return reordered;
            })
          : newPreview;

      return {
        ...prev,
        ...updatedData,
        preview: reorderedPreview,
        issues: newIssues,
        qualityScore: newQuality,
        finalOrderedColumns: newOrder,
      };
    });
  };

  /* ---------- Export ---------- */
  const handleExport = async () => {
    if (!fileData) return;
    try {
      const res = await fetch(`${API_BASE}/api/files/${fileData.id}/export?format=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleaned_${fileData.filename ?? "data"}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "✅ Export completed!",
        description: "Your cleaned data has been downloaded.",
      });
    } catch (err: any) {
      console.error("Export error:", err);
      toast({
        title: "Export failed",
        description: err?.message || "There was an error exporting your data.",
        variant: "destructive",
      });
    }
  };

  /* ---------- Upgrade Modal ---------- */
  const handleUpgradeNow = () => {
    setShowUpgradePrompt(false);
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- Smart Preview Toggle ---------- */
  const handleSmartToggle = (checked: boolean) => {
    if (checked) {
      setShowUpgradePrompt(true);
      setTimeout(() => setSmartPreview(false), 500);
      return;
    }
    setSmartPreview(checked);
  };

const handleFullScreen = () => {
  const video = videoRef.current;
  if (!video) return;

  if (video.requestFullscreen) {
    video.requestFullscreen();
  }
}

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="flex flex-1">
        <main className="flex-1">
          <div className="h-full flex flex-col">
            {fileData && !fileData.recordA && (
              <DataQualityScore
                file={{ id: fileData.id, name: fileData.filename, path: "" }}
                qualityScore={fileData.qualityScore ?? 0}
                issues={fileData.issues ?? []}
                onExport={handleExport}
              />
            )}

        <div className="flex-1 p-6 overflow-hidden">
  {!fileData ? (
    <div className="w-full flex flex-col items-center">

      {/* ---------------- HERO SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 pt-20 px-6">

        {/* LEFT SIDE */}
        <div className="flex flex-col items-start text-left max-w-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-snug mb-4">
            Clean, standardize & format your data automatically with just{" "}
            <span className="text-primary">one click!</span>
          </h2>

          <p className="text-muted-foreground mb-6 text-base md:text-lg">
            Upload your dataset and watch DataPurify clean, standardize,
            validate, and format it — automatically.
          </p>

          <UploadTriggerButton
            open={showUploadModal}
            onOpenChange={setShowUploadModal}
            onCleanUpload={(file) => {
              if (!user) {
                openAuthModal();
                return;
              }
              setShowUploadModal(false);
              handleFileUpload(file);
            }}
            onRecordLinkageUpload={(fileA, fileB) => {
              if (!user) {
                openAuthModal();
                return;
              }
              setShowUploadModal(false);
              handleRecordLinkageUpload(fileA, fileB);
            }}
          />
        </div>

        {/* RIGHT SIDE - VIDEO */}
<div className="flex justify-center w-full md:w-[55%]">
  <div
    className="relative rounded-2xl overflow-hidden shadow-xl border border-border/40 bg-card w-full max-w-xl cursor-pointer"
    onClick={handleFullScreen}
  >
    <video
      ref={videoRef}
      src="/saass.mp4"
      className="w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
    />

    {/* Hover overlay */}
    <div className="absolute inset-0 flex items-center justify-center 
                    opacity-0 hover:opacity-100 transition duration-200 
                    bg-black/20 pointer-events-none">
      <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-md">
        Click to view full screen
      </span>
    </div>
  </div>
</div>
      </section>

      {/* ---------------- FEATURES SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
        <CardsSection />
      </section>

      {/* ---------------- PRICING SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
          <PricingSection />  
      </section>

    </div>
    ) : ( <div className="h-full flex flex-col relative">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Data Preview</h2>
                    
                      <div className="flex items-center space-x-2 relative">
                      <span className="text-sm text-muted-foreground">Smart Preview</span>
                      <div className="relative">
                        <Switch checked={smartPreview} onCheckedChange={handleSmartToggle} />
                        <div
                          className="absolute inset-0 backdrop-blur-sm bg-black/20 rounded-md flex items-center justify-center cursor-pointer"
                          onClick={() => setShowUpgradePrompt(true)}
                        >
                          <Lock className="w-4 h-4 text-white mr-1" />
                          <span className="text-xs text-white">Pro</span>
                        </div>
                      </div>
                    </div>
                  </div>
             <DataPreviewTable
              key={fileData.id}
              data={fileData.preview ?? []}
              issues={fileData.issues ?? []}
              totalRows={fileData.rowCount ?? 0}
              />
                </div>
              )}
            </div>
          </div>
        </main>

        {fileData && !fileData.recordA && (
          <SuggestionsSidebar
            fileId={fileData.id ?? ""}
            issues={fileData.issues ?? []}
            onDataUpdate={handleDataUpdate}
            originalOrder={originalOrder}
          />
        )}
      </div>

      {/* 🔒 Upgrade Modal */}
      <AnimatePresence>
        {showUpgradePrompt && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-[90%] max-w-md text-center shadow-xl"
            >
              <Lock className="h-10 w-10 mx-auto text-primary mb-3" />
              <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Smart Preview & large file uploads are available only for Pro users.
              </p>
              <Button onClick={handleUpgradeNow} className="w-full mb-2">
                Upgrade Now
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowUpgradePrompt(false)}
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
