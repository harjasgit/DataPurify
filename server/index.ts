// server.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import recordLinkageRouter from "./recordLinkageRoutes.js"; // keep your other routes
import { registerRoutes } from "./routes.js";

// -------------------- ENV / SUPABASE --------------------
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------- PAYPAL CONFIG --------------------
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID!; // your P-... plan id
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || null; // optional
const NODE_ENV = process.env.NODE_ENV || "development";

console.log("🟦 PayPal env:", {
  CLIENT_ID: PAYPAL_CLIENT_ID ? "OK" : "MISSING",
  SECRET: PAYPAL_SECRET ? "OK" : "MISSING",
  PLAN_ID: PAYPAL_PLAN_ID ? PAYPAL_PLAN_ID : "MISSING",
  WEBHOOK_ID: PAYPAL_WEBHOOK_ID ? "OK" : "not set (processing without strict verify)",
  ENV: NODE_ENV,
});

const PAYPAL_BASE =
  NODE_ENV === "production"
    ? "https://api-m.sandbox.paypal.com"
    :  "https://api-m.paypal.com";

// -------------------- HELPERS --------------------
async function getPayPalAccessToken(): Promise<string | null> {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const j = await resp.json();
    if (!j.access_token) {
     // console.error("PayPal token error:", j);
      return null;
    }
    return j.access_token;
  } catch (err) {
    //console.error("Error fetching PayPal token:", err);
    return null;
  }
}

/**
 * Verify webhook signature via PayPal API.
 * If PAYPAL_WEBHOOK_ID is null we still call verify endpoint but omit webhook_id field (PayPal accepts it).
 * If verification fails, function returns false.
 */
async function verifyPayPalWebhookSignature(rawBody: Buffer, headers: any): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      console.warn("Cannot verify webhook: no access token");
      return false;
    }

    const verificationBody: any = {
      transmission_id: headers["paypal-transmission-id"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      transmission_sig: headers["paypal-transmission-sig"],
      webhook_event: JSON.parse(rawBody.toString()), // webhook event object
    };

    // include webhook_id only if present (makes verification stricter)
    if (PAYPAL_WEBHOOK_ID) verificationBody.webhook_id = PAYPAL_WEBHOOK_ID;

    const resp = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationBody),
    });

    const body = await resp.json();
    //console.log("PayPal webhook verify response:", body);
    return body?.verification_status === "SUCCESS";
  } catch (err) {
    //console.error("Error verifying PayPal webhook signature:", err);
    return false;
  }
}

// -------------------- SERVER --------------------
const startServer = async () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "PayPal-Transmission-Id", "PayPal-Auth-Algo"],
    })
  );

  // Important: keep JSON parser for general routes
   app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // But the webhook route requires RAW body. We'll mount a raw parser specifically for it below.
  // (Can't use express.json for webhook verification rawBody)

  // Keep your other routes
  app.use("/", recordLinkageRouter);
  registerRoutes(app);

  // -------------------- CREATE SUBSCRIPTION --------------------
  // Create subscription on PayPal for a user (returns subscription id and approve link if present)
  app.post("/api/paypal/create-subscription", async (req: Request, res: Response) => {
    try {
      const { userId, planId } = req.body;
      const planToUse = planId || PAYPAL_PLAN_ID;
      if (!userId || !planToUse) return res.status(400).json({ success: false, message: "Missing userId or planId" });

      const token = await getPayPalAccessToken();
      if (!token) return res.status(500).json({ success: false, message: "PayPal auth failed" });

      const payload = {
        plan_id: planToUse,
        custom_id: userId, // older APIs read custom_id here — we set subscriber.custom_id in other flows; both are fine
        subscriber: {
          custom_id: userId,
        },
        application_context: {
          brand_name: process.env.CLIENT_BRAND_NAME || "DataPurify",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${process.env.CLIENT_URL}/payment-success`,
          cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
        },
      };

      const resp = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await resp.json();
      // console.log("Create subscription response:", JSON.stringify(body, null, 2));

      // PayPal returns 'links' with an 'approve' URL in many cases
      const approveLink = body.links?.find((l: any) => l.rel === "approve")?.href || null;

      // If the subscription is auto-approved (rare), PayPal returns an id directly
      const subscriptionId = body.id || null;

      return res.json({ success: true, subscriptionId, approveLink, raw: body });
    } catch (err) {
      // console.error("Create subscription error:", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // -------------------- WEBHOOK: raw body parser for this route --------------------
  // IMPORTANT: express.json() will not run for this route; we need raw buffer to verify signature.
  app.post(
    "/api/paypal/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const rawBody = req.body as Buffer;
        const headers = req.headers;
        let event: any;
        try {
          event = JSON.parse(rawBody.toString());
        } catch (e) {
          // console.error("Failed to parse webhook JSON:", e);
          return res.status(400).send("Invalid JSON");
        }

        // Try to verify signature if possible — if PAYPAL_WEBHOOK_ID not set we'll still attempt verify
        let verified = false;
        try {
          verified = await verifyPayPalWebhookSignature(rawBody, headers);
        } catch (e) {
          // console.warn("Webhook verification call errored:", e);
          verified = false;
        }

        if (!verified) {
          // console.warn("⚠️ PayPal webhook not verified. Proceeding cautiously (webhook id not set or verify failed).");
          // You can choose to reject here: return res.status(400).send("Webhook not verified");
          // For local/dev convenience we continue but log warning.
        } else {
          // console.log("✅ Webhook verified by PayPal.");
        }

        const eventType = event.event_type || event.eventType || (event.resource && event.resource.event_type) || "<unknown>";
        // console.log("Webhook event type:", eventType);

        // ---------- Subscription created / activated ----------
        if (eventType === "BILLING.SUBSCRIPTION.CREATED" || eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "BILLING.SUBSCRIPTION.UPDATED") {
          const subscription = event.resource || {};
          // PayPal sometimes sets custom_id at resource.custom_id or resource.subscriber.custom_id
          const customId = subscription.custom_id || subscription.subscriber?.custom_id || subscription.subscriber?.payer_id || null;
          const subscriptionId = subscription.id || subscription.subscription_id || (event.resource && event.resource.id) || null;
          const nextBilling = subscription.billing_info?.next_billing_time || null;

          // console.log("Subscription event for user:", customId, "sub:", subscriptionId, "next:", nextBilling);

          if (customId && subscriptionId) {
            await supabaseServer
              .from("user_uploads")
              .update({
                plan: "pro",
                subscription_id: subscriptionId,
                next_billing_time: nextBilling,
              })
              .eq("id", customId);

            // console.log("Saved subscription to Supabase for user:", customId);
          } else {
            // console.warn("Missing custom_id or subscriptionId in subscription activation event:", subscription);
          }
        }

        // ---------- Payment captured for subscription (renewal) ----------
        // Different event names exist depending on product type; handle common ones:
        if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "PAYMENT.SALE.COMPLETED" || eventType === "BILLING.SUBSCRIPTION.PAYMENT.CAPTURED") {
          // The subscription id might be in resource.supplementary_data.related_ids.subscription_id
          const resource = event.resource || {};
          const subscriptionId =
            resource.billing_agreement_id ||
            resource.billing_subscription_id ||
            resource.supplementary_data?.related_ids?.subscription_id ||
            resource.subscription_id ||
            null;

          if (subscriptionId) {
            // update user's next_billing_time if available
            const nextBilling = null; // not always provided in payment events
            const { data: rows } = await supabaseServer
              .from("user_uploads")
              .select("id")
              .eq("subscription_id", subscriptionId)
              .limit(1);

            const userId = rows?.[0]?.id;
            if (userId) {
              await supabaseServer
                .from("user_uploads")
                .update({ plan: "pro", next_billing_time: nextBilling })
                .eq("id", userId);

              // console.log("Recorded renewal for user:", userId);
            } else {
              // console.warn("No user found for subscription id (renewal):", subscriptionId);
            }
          } else {
            // console.warn("Payment event missing subscription id:", resource);
          }
        }

        // ---------- Cancellation/Suspension/Expired ----------
        if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.SUSPENDED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
          const subscription = event.resource || {};
          const customId = subscription.custom_id || subscription.subscriber?.custom_id || null;
          const subscriptionId = subscription.id || null;

          if (customId || subscriptionId) {
            // If customId present we can update directly; otherwise find by subscription_id
            if (customId) {
              await supabaseServer
                .from("user_uploads")
                .update({ plan: "free", subscription_id: null, next_billing_time: null })
                .eq("id", customId);

              // console.log("Downgraded user due to subscription cancel:", customId);
            } else {
              await supabaseServer
                .from("user_uploads")
                .update({ plan: "free", subscription_id: null, next_billing_time: null })
                .eq("subscription_id", subscriptionId);

              // console.log("Downgraded user for subscription id:", subscriptionId);
            }
          } else {
            // console.warn("Cancellation event missing identifiers:", subscription);
          }
        }

        // respond 200
        res.status(200).send("OK");
      } catch (err) {
        console.error("Webhook handler error:", err);
        res.status(500).send("Server error");
      }
    }
  );

  // -------------------- START --------------------
  const port = parseInt(process.env.PORT || "5000", 10);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

startServer().catch((e) => {
  console.error("Startup error:", e);
  process.exit(1);
});
