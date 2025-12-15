import { X } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/hooks/use-toast";


export default function BetaPromoBanner() {
  const [visible, setVisible] = useState(true);
  const { user } = useUser(); // logged-in user
  const { toast } = useToast();

  if (!visible) return null;
  const handleRequestClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Not logged in → block
    if (!user) {
     toast({
      title: "Sign up required",
      description: "Please sign up or log in to request a beta code.",
      variant: "destructive",
    });      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/request-beta-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        toast({
        title: "Error",
        description: json.error || "Something went wrong!",
        variant: "destructive",
   });

        return;
      }

      // If user already has a code

      if (json.message === "Code already exists") {
       toast({
        title: "Beta Code Already Exists",
        description: "You already have a beta code. Please check your email.",
      });
        return;
      }

   toast({
   title: "🎉 Beta Code Sent!",
   description: "Please check your email for your beta access code.",
   
  });

    } catch (err) {
      console.error(err);
      toast({
  title: "Failed to Send Beta Code",
  description: "Something went wrong. Please try again.",
  variant: "destructive",
});

    }
  };

  return (
    <div className="w-full bg-[#1a1a2e]/95 border-b border-[#8668FD]/30 text-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-6">

        {/* MAIN TEXT */}
        <p className="text-sm flex items-center gap-3 leading-relaxed tracking-[0.5px] text-center">
          <span className="text-lg">🎉</span>

          <span className="font-semibold text-[#B49CFF]">
            Limited Beta Access:
          </span>

          <span className="text-gray-300">
            Try DataPurify
            <span className="text-[#B49CFF] font-medium"> FREE during Beta </span>
            in exchange for your honest feedback.
          </span>
        </p>

        {/* CTA */}
        <button
          onClick={handleRequestClick}
          className="text-sm font-medium text-[#B49CFF] underline underline-offset-2 whitespace-nowrap hover:text-[#d3c5ff]"
        >
          Request Beta Code
        </button>

        {/* CLOSE BTN */}
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
