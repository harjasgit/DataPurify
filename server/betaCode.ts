// betaCode.ts
import express from "express";
import { Resend } from "resend";
import { betaCodesStorage } from "./betaCodesStorage.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!, // onboarding@resend.dev
      to,
      subject,
      html,
    });

    console.log("📧 Email sent to", to);
  } catch (err) {
    console.error("❌ Email failed (Resend):", err);
  }
}


// ----------------------
// Helper: generate random beta code
// ----------------------
function generateBetaCode() {
  return "DP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// =====================================================
// 1️⃣  ROUTE — REQUEST BETA CODE
// =====================================================
router.post("/request-beta-code", async (req, res) => {
  const { user_id, email } = req.body;

  if (!user_id || !email) {
    return res.status(400).json({ error: "Missing user_id or email" });
  }

  const existing = await betaCodesStorage.getExistingCode(user_id);

  if (existing) {
    return res.json({
      message: "Code already exists",
      code: existing.code,
    });
  }

  const code = generateBetaCode();

  try {
    await betaCodesStorage.createCode(user_id, code);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }

  // ✅ respond immediately
  res.json({ message: "Beta code sent", code });

  // ✅ send email async (non-blocking)
  sendEmail({
    to: email,
    subject: "🎉 Your DataPurify Beta Access Code",
    html: `
      <h2>Welcome to DataPurify Beta!</h2>
      <p>Your unique access code:</p>
      <h3 style="font-size:24px;letter-spacing:2px">${code}</h3>
      <p>Enter this code on the Pricing page to unlock full Beta Access.</p>
      <p>Thank you for being an early tester 🚀</p>
    `,
  });
});

// =====================================================
// 2️⃣  ROUTE — VERIFY BETA CODE  (NEW)
// =====================================================
router.post("/verify-beta-code", async (req, res) => {
  const { user_id, code } = req.body;

  if (!user_id || !code) {
    return res.status(400).json({ error: "Missing user_id or code" });
  }

  try {
    const stored = await betaCodesStorage.getExistingCode(user_id);

    if (!stored) {
      return res.status(404).json({ error: "No beta code found" });
    }

    if (stored.code !== code) {
      return res.status(400).json({ valid: false, error: "Invalid beta code" });
    }

    await betaCodesStorage.markUsed(code);
    await betaCodesStorage.activateBetaForUser(user_id);

    return res.json({
      valid: true,
      message: "Beta code verified. Access granted.",
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});


// =====================================================
// 3️⃣ ROUTE — SEND FEEDBACK AFTER FIRST UPLOAD
// =====================================================

router.post("/post-first-upload", async (req, res) => {
  const { user_id, email } = req.body;

  if (!user_id || !email) {
    return res.status(400).json({ error: "Missing user_id or email" });
  }

  try {
    const record = await betaCodesStorage.getExistingCode(user_id);

    if (!record || !record.is_used) {
      return res.status(403).json({ error: "Beta not active" });
    }

    if (record.feedback_sent) {
      return res.json({ message: "Feedback already sent" });
    }

    // respond first
    res.json({ message: "Feedback email sent" });

    // send email async
    sendEmail({
      to: email,
      subject: "💬 Quick feedback on DataPurify?",
      html: `
        <h2>How was your first experience?</h2>
        <p>You just used <strong>DataPurify</strong> 🎉</p>
        <p>We’d love a quick 30-second review.</p>

        <a href="https://forms.gle/cZ4mLRnv2xMapm628"
          style="background:#6d5bff;color:white;padding:12px 20px;
          text-decoration:none;border-radius:6px;display:inline-block;">
          ⭐ Give Feedback
        </a>

        <p>Thank you for helping us improve 🙌</p>
      `,
    });

    await betaCodesStorage.markFirstUpload(user_id);
    await betaCodesStorage.markFeedbackSent(user_id);

  } catch (err) {
    console.error("Feedback trigger error:", err);
    return res.status(500).json({ error: "Failed to send feedback" });
  }
});

export default router;
