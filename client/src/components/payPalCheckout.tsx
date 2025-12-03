// @ts-nocheck
import React, { useEffect, useRef } from "react";

export default function PayPalSubscription({ userId, onSuccess }) {
  const containerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    const backendUrl = import.meta.env.VITE_API_URL; // 🔥 REQUIRED

    if (!clientId) {
      console.error("❌ Missing VITE_PAYPAL_CLIENT_ID");
      alert("Missing PayPal client ID");
      return;
    }

    if (!backendUrl) {
      console.error("❌ Missing VITE_BACKEND_URL");
      alert("Missing backend API URL");
      return;
    }

    const scriptId = "paypal-sdk";

    // Load PayPal script only once
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => renderButtons();
      document.body.appendChild(script);
    } else {
      renderButtons();
    }

    function renderButtons() {
      if (!window.paypal) return;

      // Clear buttons if re-rendering
      if (containerRef.current) containerRef.current.innerHTML = "";

      window.paypal
        .Buttons({
          style: {
            shape: "rect",
            layout: "vertical",
            color: "blue",
            label: "subscribe",
          },

          // 1️⃣ Create subscription through backend ONLY (secure)
          createSubscription: async () => {
            try {
              const res = await fetch(
                `${backendUrl}/api/paypal/create-subscription`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                }
              );

              // Check if backend returned HTML (Vercel mistake)
              const text = await res.text();
              try {
                const data = JSON.parse(text);
                return data.subscriptionId;
              } catch {
                console.error("❌ Backend returned non-JSON:", text);
                alert("Server error: Invalid backend response");
                return;
              }
            } catch (err) {
              console.error("❌ Subscription creation failed:", err);
              alert("Unable to create subscription");
            }
          },

          // 2️⃣ Temporary approve callback (actual upgrade done in webhook)
          onApprove: async (data) => {
            console.log("Subscription approved:", data.subscriptionID);
            onSuccess?.(data.subscriptionID);
            alert("Subscription successful! 🎉");
          },

          onError: (err) => {
            console.error("❌ PayPal Error:", err);
            alert("PayPal subscription failed");
          },
        })
        .render(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} />;
}
