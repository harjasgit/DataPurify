import { X } from "lucide-react";
import { useState } from "react";

export default function EarlyAccessBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

 const handleJoinWaitlist = () => {
  document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
};


  return (
    <div className="w-full bg-[#1a1a2e]/95 border-b border-[#8668FD]/30 text-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-6">
        <p className="text-sm flex items-center gap-2 text-center text-gray-300">
          <span>🚀</span>
          <span className="font-medium">
            Early Access coming soon —
          </span>
          <span>
            Join the waitlist to be among the first to try{" "}
            <span className="text-[#B49CFF] font-semibold">DataPurify</span>
          </span>
        </p>

        {/* CTA */}
        <button
          onClick={handleJoinWaitlist}
          className="text-sm font-medium text-[#B49CFF] underline underline-offset-2 hover:text-[#d3c5ff]"
        >
          Join Waitlist
        </button>

        {/* Close */}
        <button
          className="text-gray-400 hover:text-white"
          onClick={() => setVisible(false)}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
