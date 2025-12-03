import React, { useState } from "react";
import { CheckCircle2, Sparkles, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/userContext";
import PayPalSubscription from "@/components/payPalCheckout";

// PLAN CONFIG
const plans = [
  {
    name: "Free",
    priceUSD: "$0 / mo",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    description: "Perfect for trying out data cleaning and record linkage.",
    sections: [
      {
        title: "Data Cleaning",
        features: [
          "Upload up to 5 files (CSV/Excel, 20MB each)",
          "Limited Exports",
          "Preview limited to 50 rows",
          "No Smart Preview",
        ],
      },
      {
        title: "Record Linkage",
        features: [
          "Manual field mapping (drag & drop)",
          "Basic smart matching (lightweight fuzzy matching)",
          "Limited export of linked results",
        ],
      },
    ],
    buttonText: "Start for Free",
    highlight: false,
  },
  {
    name: "Pro",
    priceUSD: "$6 / mo",
    icon: <Rocket className="w-6 h-6 text-primary" />,
    description: "For data professionals who want automation and accuracy.",
    sections: [
      {
        title: "Data Cleaning",
        features: [
          "Unlimited uploads (up to 50MB each)",
          "Full Smart Preview (no row limit)",
          "Unlimited Export",
        ],
      },
      {
        title: "Record Linkage",
        features: [
          "Advanced matching (high-accuracy fuzzy match)",
          "Strict rule-based exact matching",
          "Unlimited Export",
        ],
      },
    ],
    buttonText: "Upgrade to Pro",
    highlight: true,
  },
];

export const PricingSection: React.FC = () => {
  const { user } = useUser();
  const [showPayPal, setShowPayPal] = useState(false);

  const openPayPal = () => {
    if (!user?.id) {
      alert("Please log in to upgrade.");
      return;
    }
    setShowPayPal(true);
  };

  const handleSuccess = () => {
    alert("🎉 Subscription successful! You are now a PRO user.");
    setShowPayPal(false);
  };

  return (
    <section className="py-20 bg-muted/20" id="pricing-section">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Simple, Transparent <span className="text-primary">Pricing</span>
        </h2>

        <p className="text-muted-foreground mb-10">
          Choose the plan that fits your data workflow — no hidden fees.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 flex flex-col shadow-sm ${
                plan.highlight ? "border-primary" : ""
              }`}
            >
              <div>
                <div className="flex justify-center mb-4">{plan.icon}</div>

                <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>

                <p className="text-muted-foreground mb-4">
                  {plan.description}
                </p>

                <p className="text-3xl font-bold text-primary mb-4">
                  {plan.priceUSD}
                </p>

                {plan.sections.map((section, idx) => (
                  <div key={idx} className="text-left mb-4">
                    <h4 className="font-semibold text-primary mb-2">
                      {section.title}
                    </h4>

                    <ul className="space-y-2 text-muted-foreground">
                      {section.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.highlight ? "default" : "outline"}
                className="w-full mt-4"
                onClick={plan.name === "Pro" ? openPayPal : undefined}
              >
                {plan.buttonText}
              </Button>

              {/* PayPal container */}
              {plan.name === "Pro" && showPayPal && (
                <div className="mt-6">
                  <PayPalSubscription 
                    userId={user?.id}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
