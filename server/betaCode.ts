// betaCode.ts
import express from "express";
import nodemailer from "nodemailer";
import { betaCodesStorage } from "./betaCodesStorage.js";

const router = express.Router();

// ----------------------
// EMAIL TRANSPORTER
// ----------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: Number(process.env.SMTP_PORT), // 465 or 587
  secure: process.env.SMTP_SECURE === "true", // true for 465
  auth: {
    user: process.env.SMTP_USER, // your gmail
    pass: process.env.SMTP_PASS, // your gmail app password
  },
});

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

  // Check existing
  const existing = await betaCodesStorage.getExistingCode(user_id);

  if (existing) {
    return res.json({
      message: "Code already exists",
      code: existing.code,
    });
  }

  // Generate new code
  const code = generateBetaCode();

  try {
    await betaCodesStorage.createCode(user_id, code);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }

  // Send beta code email
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "🎉 Your DataPurify Beta Access Code",
      html: `
        <h2>Welcome to DataPurify Beta!</h2>
        <p>Your unique access code:</p>
        <h3 style="font-size: 24px; letter-spacing: 2px;">${code}</h3>
        <p>Enter this code on the Pricing page to unlock full Beta Access.</p>
        <br />
        <p>Thank you for being an early tester! 🚀</p>
      `,
    });

    console.log("✔ Beta code email sent to", email);
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Email sending failed" });
  }

  // Schedule Feedback Email in 15 minutes
  // setTimeout(async () => {
  //   try {
  //     await transporter.sendMail({
  //       from: process.env.FROM_EMAIL,
  //       to: email,
  //       subject: "⏳ Quick 30-Second Feedback?",
  //       html: `
  //         <h2>Your Feedback Matters 💬</h2>
  //         <p>You've been using DataPurify for a while now.</p>
  //         <p>Please share your quick feedback. It helps us improve!</p>
  //         <br />
  //         <a href="https://forms.gle/your-feedback-form-link" 
  //           style="background:#6d5bff;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;">
  //           Give Feedback
  //         </a>
  //         <br /><br />
  //         <p>Thank you so much 🙌</p>
  //       `,
  //     });

  //     console.log("✔ Feedback email sent (after 15m) →", email);
  //   } catch (err) {
  //     console.error("Feedback email failed:", err);
  //   }
  // }, 15 * 60 * 1000);

  return res.json({ message: "Beta code sent", code });
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
      return res.status(404).json({ error: "No beta code found for this user" });
    }

    if (stored.code !== code) {
      return res.status(400).json({ valid: false, error: "Invalid beta code" });
    }

    // Optionally update user status → "beta_active"
    await betaCodesStorage.markUsed(code);
       // 2️⃣ Grant beta access to user
    await betaCodesStorage.activateBetaForUser(user_id);

    return res.json({ valid: true, message: "Beta code verified. Access granted." });
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

 // 🚫 Feedback already sent → stop
    if (record.feedback_sent) {
      return res.json({ message: "Feedback already sent" });
    }

    // Send feedback email
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
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

        <br /><br />
        <p>Thank you for helping us improve 🙌</p>
      `,
    });

    // Mark feedback as sent
    await betaCodesStorage.markFirstUpload(user_id);
    await betaCodesStorage.markFeedbackSent(user_id);

   return res.json({ message: "Feedback email sent" });
  }
   catch (err) {
    console.error("Feedback trigger error:", err);
    return res.status(500).json({ error: "Failed to send feedback" });
  }
});



export default router;
