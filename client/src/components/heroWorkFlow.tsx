"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Upload, AlertTriangle, Download, CheckCircle2 } from "lucide-react";

const STEPS = ["upload", "sample", "detect", "export"] as const;

export default function HeroWorkflow() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("upload");

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        const index = STEPS.indexOf(prev);
        return STEPS[(index + 1) % STEPS.length];
      });
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-xl">
      {/* soft glow */}
      <div className="absolute -inset-10 bg-primary/20 blur-3xl rounded-full opacity-30 pointer-events-none" />

      <div
        className="
          relative rounded-3xl overflow-hidden
          bg-background/80 backdrop-blur-xl
          border border-border
          shadow-[0_25px_80px_-20px_rgba(0,0,0,0.35)]
          p-6 md:p-7
        "
      >
        <AnimatePresence mode="wait">
          {step === "upload" && <UploadStep key="upload" />}
          {step === "sample" && <SampleStep key="sample" />}
          {step === "detect" && <DetectStep key="detect" />}
          {step === "export" && <ExportStep key="export" />}
        </AnimatePresence>
      </div>

      {/* 🔹 STEP DOTS */}
      <StepDots current={step} />
    </div>
  );
}

/* ---------------- Animations ---------------- */

const container: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.98,
    transition: { duration: 0.25 },
  },
};

/* ---------------- Step Dots ---------------- */

function StepDots({
  current,
}: {
  current: (typeof STEPS)[number];
}) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {STEPS.map((step) => {
        const active = step === current;

        return (
          <motion.span
            key={step}
            className="h-2.5 w-2.5 rounded-full"
            animate={{
              scale: active ? 1.4 : 1,
              opacity: active ? 1 : 0.4,
              backgroundColor: active
                ? "rgb(139 92 246)" // primary purple
                : "rgba(148,163,184,0.4)", // slate
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        );
      })}
    </div>
  );
}

/* ---------------- Steps ---------------- */

function UploadStep() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full flex flex-col justify-center items-center text-center gap-5"
    >
      <div className="p-4 rounded-2xl bg-primary/10">
        <Upload className="h-8 w-8 text-primary" />
      </div>

      <h3 className="text-lg font-semibold text-foreground">
        Upload your file
      </h3>

      <div className="w-full max-w-sm rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground border">
        customers.csv{" "}
        <span className="text-primary font-medium">uploaded ✓</span>
      </div>
    </motion.div>
  );
}

function SampleStep() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full flex flex-col gap-4"
    >
      <h3 className="text-sm font-semibold text-muted-foreground">
        Preview your data
      </h3>

      <div className="rounded-xl border bg-muted/50 overflow-hidden">
        <TableHeader />
        <TableRow id="C001" email="alex@company.com" name="Alex Morgan" />
        <TableRow id="C002" email="sara@company.com" name="Sara Lee" />
        <TableRow id="C002" email="sara@company.com" name="Sara Lee" />
        <TableRow id="C004" email="—" name="John Carter" />
      </div>

      <p className="text-xs text-muted-foreground">
        Showing sample rows from your file
      </p>
    </motion.div>
  );
}

function DetectStep() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-red-500">
        <AlertTriangle className="h-4 w-4" />
        Issues detected
      </div>

      <div className="rounded-xl border overflow-hidden">
        <TableHeader />
        <TableRow duplicate id="C002" email="sara@company.com" name="Sara Lee" />
        <TableRow duplicate id="C002" email="sara@company.com" name="Sara Lee" />
        <TableRow missing id="C004" email="—" name="John Carter" />
      </div>

      <p className="text-sm text-red-500 font-medium">
        Duplicate & missing values found
      </p>
    </motion.div>
  );
}

function ExportStep() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full flex flex-col justify-center items-center gap-5 text-center"
    >
      <div className="p-4 rounded-2xl bg-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>

      <h3 className="text-lg font-semibold text-foreground">
        Export clean data
      </h3>

      <button
        className="
          px-6 py-3 rounded-xl
          bg-gradient-to-r from-primary to-violet-500
          text-white font-medium
          shadow-lg hover:opacity-95 transition
        "
      >
        Download cleaned file ✓
      </button>
    </motion.div>
  );
}

/* ---------------- Table ---------------- */

function TableHeader() {
  return (
    <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground bg-background px-4 py-2 border-b">
      <div>ID</div>
      <div>Email</div>
      <div>Name</div>
    </div>
  );
}

function TableRow({
  id,
  email,
  name,
  duplicate,
  missing,
}: {
  id: string;
  email: string;
  name: string;
  duplicate?: boolean;
  missing?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 px-4 py-2 text-sm border-b last:border-none ${
        duplicate
          ? "bg-red-500/10 text-red-600"
          : missing
          ? "bg-yellow-500/10 text-yellow-700"
          : "bg-background text-foreground"
      }`}
    >
      <div>{id}</div>
      <div>{email}</div>
      <div>{name}</div>
    </div>
  );
}
