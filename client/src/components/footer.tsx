import { Mail, Database, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] text-gray-300 pt-14 pb-6 mt-20">
      
      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 items-center gap-6">

        {/* LEFT — BRAND */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              DataPurify
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
            <span className="flex items-center justify-center md:justify-start gap-1 mb-1 text-gray-300">
              <Lock size={13} /> Privacy-first, rule-based data cleaning
            </span>
            No AI. No third-party sharing. Files auto-delete within{" "}
            <span className="text-white font-medium">24 hours</span>.
          </p>
        </div>

        {/* CENTER — POLICIES */}
        <div className="flex justify-center gap-8 text-sm">
          <a href="/privacy" className="hover:text-white transition">
            Privacy
          </a>
          <a href="/terms" className="hover:text-white transition">
            Terms
          </a>
        </div>

        {/* RIGHT — CONTACT */}
        <div className="flex justify-center md:justify-end">
          <a
            href="mailto:datapurify@gmail.com"
            className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center hover:border-white transition"
            aria-label="Contact"
          >
            <Mail size={16} />
          </a>
        </div>

      </div>

      {/* BOTTOM TEXT */}
      <div className="border-t border-gray-800 mt-10 pt-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} DataPurify. All rights reserved.
      </div>
    </footer>
  );
}
