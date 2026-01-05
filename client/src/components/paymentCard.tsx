import React, { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useUser } from "@/context/userContext";
import { toast } from "@/hooks/use-toast";

export const PricingSection: React.FC = () => {
  const { user} = useUser();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================
  // VERIFY BETA CODE HANDLER
  // ============================
  const handleVerify = async () => {
    if (!user) return alert("Please sign up first!");
    if (!code.trim()) return alert("Enter your beta code");

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/verify-beta-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            code,
          }),
        }
      );

      const json = await res.json();

      if (json.valid) {
          toast({
         title: "🎉 Beta Access Activated",
         description: "You can now upload files.",
        });

        
      //  await refreshUser();

        setShowCodeInput(false); // hide input
        setCode(""); // reset input
      } else {
        alert(json.error || "Invalid beta code");
      }
    } catch (err) {
      console.error(err);
      alert("Verification failed");
    }

    setLoading(false);
  };

  return (
    <section
  id="pricing-section"
  className="relative -mt-20 pt-16 pb-24"
>
  <div className="relative max-w-4xl mx-auto px-6 text-center">
    <h2 className="text-3xl font-bold text-foreground mb-3">
      Simple, Transparent{" "}
      <span className="text-primary">Pricing</span>
    </h2>
    
    <p className="text-muted-foreground mt-3 text-lg">
      We're currently in{" "}
      <span className="text-primary font-medium">Beta Mode</span>. Enjoy full
      access while we refine the experience.
    </p>

    {/* SINGLE CARD */}
    <div className="mt-14 flex justify-center">
      <div
        className="
          w-full max-w-md p-8 rounded-3xl border
          shadow-xl transition-all duration-300

          bg-white text-gray-900 border-gray-200
          dark:bg-[#0f0f17] dark:text-white dark:border-white/10
        "
      >
        <div className="flex justify-center mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>

        <h3 className="text-2xl font-semibold">
          Basic Plan
        </h3>

        <p className="text-4xl font-bold text-primary mt-2">
          $6 / mo
        </p>

        <p className="
          mt-2 inline-block px-4 py-1 text-xs rounded-full
          bg-primary/10 text-primary font-medium
        ">
          Full Beta Access
        </p>

        <ul className="mt-8 space-y-2 text-left text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Unlimited uploads (20MB)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Full Smart Preview — Live Cleaning
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            No row limits
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Unlimited export
          </li>
        </ul>

        {/* BETA CODE BUTTON */}
        {!showCodeInput && (
          <button
            onClick={() => setShowCodeInput(true)}
            className="
              w-full mt-8 py-3 rounded-xl font-medium transition-all
              bg-primary text-white hover:bg-primary/90
            "
          >
            Have a Beta Code?
          </button>
        )}

        {/* CODE INPUT FIELD */}
        {showCodeInput && (
          <div className="mt-8 flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter beta code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="
                flex-1 px-4 py-3 rounded-xl outline-none transition

                bg-gray-100 text-gray-900 placeholder-gray-500
                border border-gray-300 focus:border-primary

                dark:bg-black/30 dark:text-white dark:placeholder-gray-400
                dark:border-white/10
              "
            />

            <button
              onClick={handleVerify}
              disabled={loading}
              className="
                px-5 py-3 rounded-xl font-medium transition-all
                bg-primary text-white hover:bg-primary/90
              "
            >
              {loading ? "..." : "Verify"}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
</section>
  );
};
