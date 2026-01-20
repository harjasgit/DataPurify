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
import PreviewSection from "@/components/PreviewSection";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/userContext";
import { useRef , useEffect} from "react";
import TestimonialsSection from "@/components/TestimonialSection";
import EarlyWaitlistSection from "@/components/emailWaitlistSection";
import { supabase } from "@/lib/supabaseClient";
import WaitlistSocialProof from "@/components/waitlistSocialProof";
import HeroWorkflow from "@/components/heroWorkFlow";
import Problem from "@/components/problem";

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
  const [waitlistCount, setWaitlistCount] = useState(0);
  const { plan } = useUser();

//waitlist count fetch

const fetchWaitlistCount = async () => {
  // console.log("FETCHING WAITLIST COUNT...");

  const { data, error } = await supabase.rpc("get_waitlist_count");

  // console.log("RPC RESPONSE:", { data, error });

  if (error) {
    console.error("Error fetching waitlist count:", error);
    return;
  }

  setWaitlistCount(Number(data) || 0);
};

useEffect(() => {
  fetchWaitlistCount();
}, []);


  
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
<section className="relative w-full max-w-7xl mx-auto 
  pt-12 sm:pt-16 
  pb-16 sm:pb-24 
  px-4 sm:px-6"
>
  <div className="grid grid-cols-1 md:grid-cols-12 gap-12 sm:gap-16 items-center">

    {/* LEFT */}
    <div className="
      md:col-span-6 
      flex flex-col 
      items-start 
      space-y-6 sm:space-y-7 
      max-w-xl
    ">
      {/* Badge */}
      <div
        className="
          inline-flex items-center gap-2 
          px-3 py-1.5 sm:px-4 
          rounded-full
          bg-primary/10 text-primary 
          text-xs sm:text-sm 
          font-medium 
          border border-primary/20
        "
      >
        🔒 Your data stays yours
      </div>

      {/* Heading */}
      <h1 className="
        text-2xl sm:text-3xl md:text-5xl
        font-bold 
        text-foreground 
        leading-tight
      ">
        Stop wasting hours cleaning{" "}
        <span className="text-primary">messy data</span>
      </h1>

      {/* Subtext */}
      <p className="
        text-sm sm:text-base md:text-xl
        text-muted-foreground
        leading-relaxed
        max-w-md
      ">
        DataPurify cleans CSV & Excel files by fixing duplicates,
        missing values, and formatting issues — in seconds.
      </p>

      {/* CTAs */}
      <div className="
        flex flex-col sm:flex-row
        items-stretch sm:items-center
        gap-3 sm:gap-4
        w-full sm:w-auto
      ">
        <button
          onClick={() =>
            document
              .getElementById("waitlist")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="
            w-full sm:w-auto
            px-6 py-3 
            rounded-xl 
            bg-primary 
            text-white 
            font-medium
            hover:opacity-90 
            transition
          "
        >
          Join the Waitlist
        </button>

        <a
          href="#preview-section"
          className="
            w-full sm:w-auto
            px-6 py-3 
            rounded-xl 
            border border-border
            text-foreground 
            font-medium 
            text-center
            hover:bg-muted 
            transition
          "
        >
          See Preview
        </a>
      </div>

      {/* Social Proof */}
      <WaitlistSocialProof count={waitlistCount} />
    </div>

    {/* RIGHT */}
    <div className="
      md:col-span-6 
      flex justify-center 
      mt-8 md:mt-0
      md:-translate-y-6
    ">
      <HeroWorkflow />
    </div>

  </div>
</section>


 {/* ---------------- PROBLEMS SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
        <Problem />
      </section>
  

 {/* ---------------- FEATURES SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
        <CardsSection />
      </section>

      {/* ---------------- Preview SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
          <PreviewSection />  
      </section>

        {/* ---------------- Testimonials SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
          <TestimonialsSection />  
      </section>

        {/* ---------------- Early Waitlist SECTION ---------------- */}
      <section className="w-full max-w-7xl mx-auto mt-24 px-6">
      <EarlyWaitlistSection onJoined={fetchWaitlistCount} />
      </section>

    </div>
    ) : ( <div className="h-full flex flex-col relative">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Data Preview</h2>
                    
                      <div className="flex items-center space-x-2 relative">
                      <span className="text-sm text-muted-foreground"></span>
                      <div className="relative">
                        <Switch checked={smartPreview} onCheckedChange={handleSmartToggle} />
                        <div
                          className="absolute inset-0 backdrop-blur-sm bg-black/20 rounded-md flex items-center justify-center cursor-pointer"
                          onClick={() => setShowUpgradePrompt(true)}
                        >
                          {/* <Lock className="w-4 h-4 text-white mr-1" /> */}
                          <span className="text-xs text-white"></span>
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
