// src/components/auth/AuthForm.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AuthFormProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
}

export default function AuthForm({ onClose, onAuthSuccess }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  /* --------------------------------------------------------
   * SIGNUP + LOGIN (NO EMAIL CONFIRMATION)
   * -------------------------------------------------------- */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        /* 🔥 SIGNUP — NO EMAIL CONFIRMATION SENT */
        const { data: signupData, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined, // disables confirmation email
            data: { full_name: name },
          },
        });

        console.log("Signup response:", signupData);

        if (signupErr) throw signupErr;

        /* 🔥 AUTO LOGIN */
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log("Auto-login response:", loginData);

        if (loginErr) throw loginErr;

        setMessage("🎉 Account created & logged in!");
        onAuthSuccess?.();
        onClose?.();
        return;
      }

      /* --------------------------------------------------------
       * LOGIN
       * -------------------------------------------------------- */
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Login response:", loginData);

      if (loginErr) throw loginErr;

      setMessage("🎉 Logged in successfully!");
      onAuthSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error("Auth error:", err);
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------
   * GOOGLE LOGIN
//    * -------------------------------------------------------- */
// const handleGoogle = async () => {
//   setLoading(true);
//   try {
//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: "http://localhost:5173/",  // 🔥 REQUIRED FIX
//       },
//     });

//     if (error) throw error;
//   } catch (err: any) {
//     console.error("Google login error:", err);
//     setMessage(err.message);
//   } finally {
//     setLoading(false);
//   }
// };


  /* --------------------------------------------------------
   * UI
   * -------------------------------------------------------- */
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg relative">

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 text-xl"
          >
            ✕
          </button>
        )}

        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignup ? "Create an Account" : "Welcome Back 👋"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">

          {isSignup && (
            <input
              type="text"
              placeholder="Your name"
              className="w-full p-3 border rounded-lg text-black"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg"
          >
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center">
          <hr className="flex-grow" />
          <span className="px-2 text-gray-500 text-sm">or</span>
          <hr className="flex-grow" />
        </div>

        {/* <button
          onClick={handleGoogle}
          className="w-full py-2 border rounded-lg flex items-center justify-center gap-2"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="w-5 h-5"
          />
          Continue with Google
        </button> */}

        <p className="mt-6 text-sm text-center">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <button className="text-indigo-600 underline" onClick={() => setIsSignup(false)}>
                Log In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button className="text-indigo-600 underline" onClick={() => setIsSignup(true)}>
                Sign Up
              </button>
            </>
          )}
        </p>

        {message && (
          <p className="mt-4 text-center text-sm text-red-500">{message}</p>
        )}
      </div>
    </div>
  );
}
