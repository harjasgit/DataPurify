import React from "react";

const BetaTerms: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service <span className="text-sm text-muted-foreground">(Beta)</span>
        </h1>

        <p className="mt-2 text-muted-foreground">
          Last updated: Beta Release – 2025
        </p>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-border" />

        {/* Beta Notice */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium">🚧 Beta Version Notice</h2>

          <p className="text-muted-foreground leading-relaxed">
            DataPurify is currently running in a <strong>beta version</strong>.
            Some features, policies, and documentation are still under
            development and may change over time.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            By continuing to use the beta version of DataPurify, you acknowledge
            and agree to the following conditions:
          </p>

          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              This product is provided <strong>as is</strong> during the beta
              phase, without guarantees of uninterrupted service.
            </li>
            <li>
              Features may be updated, modified, or removed without prior
              notice.
            </li>
            <li>
              Uploaded files are processed temporarily and are{" "}
              <strong>automatically deleted within 24 hours</strong>.
            </li>
            <li>
              DataPurify does <strong>not</strong> use AI models, machine
              learning, or third-party data sharing.
            </li>
            <li>
              This beta version is intended for testing, early access, and user
              feedback purposes only.
            </li>
          </ul>

          <p className="text-muted-foreground leading-relaxed">
            We are actively working on a complete{" "}
            <strong>Terms of Service</strong> and{" "}
            <strong>Privacy Policy</strong>, which will be published before the
            official public launch.
          </p>

          <p className="font-medium">
            By continuing to use DataPurify, you agree to participate in the beta
            version under these conditions.
          </p>
        </section>

        {/* Footer */}
        <div className="mt-12 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Thank you for supporting DataPurify during its early stage 🚀
        </div>
      </div>
    </div>
  );
};

export default BetaTerms;
