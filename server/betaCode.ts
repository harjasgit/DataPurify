// betaCode.ts
// PRODUCTION-READY FREE BETA FLOW (MAILTO BASED – NO EMAIL SERVICE)
// ---------------------------------------------------------------
// ✔ No domain required
// ✔ No Resend / Nodemailer
// ✔ Trusted: beta codes are sent manually via Gmail

import express from "express";
import { betaCodesStorage } from "./betaCodesStorage";

const router = express.Router();

// --------------------------------------------------
// Helper: generate random beta code
// --------------------------------------------------
function generateBetaCode() {
  return "DP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================================================
// 1️⃣ REQUEST BETA CODE
// ==================================================
// Frontend flow:
// - User clicks "Request Beta Code"
// - Frontend opens mailto:datapurify@gmail.com
// - User sends email manually
// - YOU reply with the generated beta code

router.post("/request-beta-code", async (req, res) => {
  const { user_id, email } = req.body;

  if (!user_id || !email) {
    return res.status(400).json({ error: "Missing user_id or email" });
  }

  const existing = await betaCodesStorage.getExistingCode(user_id);

  if (existing) {
    return res.json({
      message: "Beta request already exists. Please check your email.",
    });
  }

  const code = generateBetaCode();

  try {
    await betaCodesStorage.createCode(user_id, code);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }

  // IMPORTANT:
  // ❌ Do NOT send email from backend
  // ✔ User will receive code from datapurify@gmail.com manually

  return res.json({
    message:
      "Beta request received. Our team will email your access code shortly.",
  });
});

// ==================================================
// 2️⃣ VERIFY BETA CODE
// ==================================================
// User pastes the code they received via Gmail

router.post("/verify-beta-code", async (req, res) => {
  const { user_id, code } = req.body;

  if (!user_id || !code) {
    return res.status(400).json({ error: "Missing user_id or code" });
  }

  try {
    const stored = await betaCodesStorage.getExistingCode(user_id);

    if (!stored) {
      return res.status(404).json({ error: "No beta request found" });
    }

    if (stored.is_used) {
      return res.json({
        valid: true,
        message: "Beta already activated",
      });
    }

    if (stored.code !== code) {
      return res
        .status(400)
        .json({ valid: false, error: "Invalid beta code" });
    }

    await betaCodesStorage.markUsed(code);
    await betaCodesStorage.activateBetaForUser(user_id);

    return res.json({
      valid: true,
      message: "Beta access granted 🎉",
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

// ==================================================
// 3️⃣ POST-FIRST-UPLOAD (NO EMAIL – JUST TRACKING)
// ==================================================
// Feedback is collected via in-app link / Google Form

router.post("/post-first-upload", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  try {
    const record = await betaCodesStorage.getExistingCode(user_id);

    if (!record || !record.is_used) {
      return res.status(403).json({ error: "Beta not active" });
    }

    if (record.feedback_sent) {
      return res.json({ message: "Feedback already recorded" });
    }

    await betaCodesStorage.markFirstUpload(user_id);
    await betaCodesStorage.markFeedbackSent(user_id);

    return res.json({
      message: "First upload tracked. Feedback pending.",
    });
  } catch (err) {
    console.error("Post-upload error:", err);
    return res.status(500).json({ error: "Failed to track upload" });
  }
});

export default router;
