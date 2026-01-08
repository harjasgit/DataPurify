import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";            

const EarlyWaitlistSection = ({ onJoined }: { onJoined?: () => void }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
  if (!email || !email.includes("@")) {
    setError("Please enter a valid email");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 10000)
    );

    const insertPromise = supabase
      .from("waitlist")
      .insert([{ email }] as any);

    const { error: insertError } = (await Promise.race([
      insertPromise,
      timeoutPromise,
    ])) as any;

    if (insertError) {
      console.error("SUPABASE ERROR:", insertError);

      if (insertError.code === "23505") {
        setError("You're already on the waitlist 😉");
      } else {
        setError(insertError.message || "Something went wrong. Please try again.");
      }
    } else {
      setSuccess(true);
      setEmail("");
      onJoined?.();
    }
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    setError("Network issue. Please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <section className="relative overflow-hidden py-24 mt-3" id="waitlist">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full 
          bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-[140px]"
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 
          bg-purple-500/10 px-4 py-1.5 text-sm text-purple-400 mb-6"
        >
          <Sparkles className="w-4 h-4" />
          Early Access
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          Be among the first to{" "}
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            clean data effortlessly
          </span>
        </h2>

        {/* Subtext */}
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Join the early waitlist and get priority access, exclusive launch perks,
          and special early-user benefits when DataPurify goes live.
        </p>

        {/* Input */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="
              w-full sm:w-[320px] h-12 px-4 rounded-xl
              bg-white dark:bg-gray-900
              border border-gray-300 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-purple-500
            "
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="
              h-12 px-6 rounded-xl
              bg-gradient-to-r from-purple-500 to-blue-500
              text-white font-medium
              flex items-center justify-center gap-2
              hover:opacity-90 transition
              shadow-lg shadow-purple-500/20
              disabled:opacity-60
            "
          >
            {loading ? "Joining..." : "Join Waitlist"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <p className="mt-6 text-green-400 font-medium">
            ✅ You’ll be notified when DataPurify goes live!
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-6 text-red-400 font-medium">
            {error}
          </p>
        )}

        {/* Trust text */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          🔒 No spam. Unsubscribe anytime.
        </div>
      </div>
    </section>
  );
};

export default EarlyWaitlistSection;
