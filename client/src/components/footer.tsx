// components/Footer.tsx
import {  Twitter, Linkedin, Mail, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center gap-4">
        
        {/* Brand + Tagline */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">DataPurify</h2>
          <p className="text-sm mt-1">
            Effortless data cleaning & formatting at your fingertips.
          </p>
        </div>

        {/* Social Icons */}
        <div className="flex space-x-5">
          <a href="#" className="hover:text-white"><Instagram size={18} /></a>
          <a href="#" className="hover:text-white"><Twitter size={18} /></a>
          <a href="#" className="hover:text-white"><Linkedin size={18} /></a>
          <a href="mailto:support@datapurify.com" className="hover:text-white"><Mail size={18} /></a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} DataPurify. All rights reserved.
      </div>
    </footer>
  );
}
