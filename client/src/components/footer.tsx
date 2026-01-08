import { Mail, Database } from "lucide-react";
import { FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-background text-foreground pt-14 pb-6 mt-20 border-t border-border" id="footer">
      
      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 items-center gap-6">

        {/* LEFT — BRAND */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">
              DataPurify
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
            <span className="flex items-center justify-center md:justify-start gap-1 mb-1">
              Rule-based data cleaning, No AI.
            </span>
             No third-party sharing. Files auto-delete within{" "}
            <span className="font-medium text-foreground">24 hours</span>.
          </p>
        </div>

        {/* CENTER — POLICIES */}
        <div className="flex justify-center gap-8 text-sm">
          <a  className="hover:text-primary transition">
            Privacy
          </a>
          <a  className="hover:text-primary transition">
            Terms
          </a>
        </div>

        {/* RIGHT — SOCIAL */}
        <div className="flex justify-center md:justify-end gap-3">
          
          {/* Twitter */}
          <a
            href="https://x.com/kaurharjas166"
            target="_blank"
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition"
            aria-label="Twitter"
          >
            <FaTwitter size={15} />
          </a>

          {/* Mail */}
          <a
            href="mailto:datapurify@gmail.com"
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition"
            aria-label="Contact"
          >
            <Mail size={16} />
          </a>
        </div>

      </div>

      {/* BOTTOM TEXT */}
      <div className="border-t border-border mt-10 pt-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DataPurify. All rights reserved.
      </div>
    </footer>
  );
}
