// @ts-nocheck
import React, { useEffect, useRef } from "react";

export default function PayPalSubscription({ userId, onSuccess }) {
  const containerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    const backendUrl = import.meta.env.VITE_API_URL;
    const planId = import.meta.env.VITE_PAYPAL_PLAN_ID; // 🔥 REQUIRED!!!

    if (!clientId) {
      alert("Missing PayPal Client ID");
      return;
    }
    if (!backendUrl) {
      alert("Missing Backend URL");
      return;
    }
    if (!planId) {
      alert("❌ Missing PayPal PLAN ID");
      return;
    }

    const scriptId = "paypal-sdk";

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

      containerRef.current.innerHTML = "";

      window.paypal
        .Buttons({
          style: {
            shape: "rect",
            layout: "vertical",
            color: "blue",
            label: "subscribe",
          },

          // 1️⃣ Create subscription (frontend → backend → PayPal)
          createSubscription: async () => {
            try {
              const res = await fetch(`${backendUrl}/api/paypal/create-subscription`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  planId, // 🔥 SEND PLAN ID
                }),
              });

              const text = await res.text();
              const data = JSON.parse(text);

              if (!data.subscriptionId) {
                console.error("❌ Backend failed:", data);
                alert("Failed to create PayPal subscription");
                return;
              }

              return data.subscriptionId;
            } catch (err) {
              console.error("❌ Error:", err);
              alert("Unable to create subscription");
            }
          },

          // 2️⃣ Optional – confirmation (real upgrade is webhook)
          onApprove: (data) => {
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
