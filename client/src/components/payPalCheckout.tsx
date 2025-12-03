// @ts-nocheck
import React, { useEffect, useRef } from "react";

export default function PayPalSubscription({ planId, userId, onSuccess }) {
  const containerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      alert("❌ Missing VITE_PAYPAL_CLIENT_ID");
      return;
    }

    const scriptId = "paypal-sdk";

    // Load PayPal SDK once
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

      // Clear previous button if any
   if (containerRef.current) containerRef.current.innerHTML = "";

      window.paypal
        .Buttons({
          style: {
            shape: "rect",
            color: "blue",
            layout:"vertical",
            label: "subscribe",
          },

          // 1️⃣ Create Subscription via YOUR backend
          createSubscription: async () => {
            const res = await fetch("/api/paypal/create-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId, userId }),
            });

            const data = await res.json();
            return data.subscriptionId; // return subscription ID to PayPal SDK
          },

          // 2️⃣ On Approve — TEMPORARY success handler
          // Real PRO upgrade happens from webhook
          onApprove: async (data) => {
            console.log("Subscription approved:", data.subscriptionID);
            onSuccess?.(data.subscriptionID);
            alert("Subscription successful! 🎉");
          },

          onError: (err) => {
            console.error("PayPal Error:", err);
            alert("PayPal subscription failed");
          },
        })
        .render(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} />;
}
