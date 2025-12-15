import { Mail, Database } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] text-gray-300 pt-20 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-20">

        {/* LEFT SECTION */}
        <div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <a href="/">
              <h1 className="text-xl font-semibold text-foreground">DataPurify</h1>
            </a>
          </div>

          <p className="text-xs leading-relaxed mt-4 text-gray-400 max-w-sm">
            At DataPurify, your data stays entirely yours.
            We use strict, rule-based processing — no AI models,
            no machine learning guesses, and no third-party sharing.
            Uploaded files auto-delete within{" "}
            <span className="text-white font-medium">24 hours</span>.
          </p>
        </div>

        {/* QUICK LINKS */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-white">Home</a></li>
            <li><a href="/#features-section" className="hover:text-white">Features</a></li>
             <li><a href="/#pricing-section" className="hover:text-white">Pricing</a></li> 
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Contact</h4>

          <div className="flex items-center gap-2 mb-3">
            <Mail size={18} />
            <span className="text-sm">datapurify@gmail.com</span>
          </div>
        </div>

        {/* PRIVACY + TERMS IN THEIR OWN COLUMN */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Policies</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
            <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
          </ul>
        </div>

      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-700 mt-10 pt-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} DataPurify. All rights reserved.
      </div>
    </footer>
  );
}
