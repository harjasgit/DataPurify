import { X } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/hooks/use-toast";

export default function BetaPromoBanner() {
  const [visible, setVisible] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();

  if (!visible) return null;

  if (!user) {
    return (
      <div className="w-full bg-[#1a1a2e]/95 border-b border-[#8668FD]/30 text-white">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-sm text-gray-300">
          Sign up to request beta access.
        </div>
      </div>
    );
  }

  const handleClick = () => {
    const gmailUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      "&to=datapurify@gmail.com" +
      "&su=" +
      encodeURIComponent("Request for DataPurify Beta Access") +
      "&body=" +
      encodeURIComponent(
        `Hi DataPurify Team,

I would like to request beta access.

Name: ${user.name || ""}
Email: ${user.email}

Thank you!`
      );

    // ✅ Opens Gmail compose directly
    window.open(gmailUrl, "_blank");

    toast({
      title: "Almost there 🚀",
      description:
        "Gmail has opened. Please send the email to receive your beta code.",
    });

    // fire & forget backend logging
    fetch(`${import.meta.env.VITE_API_URL}/api/request-beta-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email,
      }),
    }).catch(console.error);
  };

  return (
    <div className="w-full bg-[#1a1a2e]/95 border-b border-[#8668FD]/30 text-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-6">
        <p className="text-sm flex items-center gap-2 text-center">
          <span>🎉</span>
          <span className="font-semibold text-[#B49CFF]">
            Limited Beta Access:
          </span>
          <span className="text-gray-300">
            Try DataPurify{" "}
            <span className="text-[#B49CFF] font-medium">
              FREE during Beta
            </span>
          </span>
          <span className="text-gray-300"> in exchange for your honest feedback</span>
        </p>

        {/* CTA */}
        <button
          onClick={handleClick}
          className="text-sm font-medium text-[#B49CFF] underline underline-offset-2 hover:text-[#d3c5ff]"
        >
          Request Beta Access
        </button>

        {/* CLOSE */}
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
