import { Zap, Eraser, Shuffle, Link2 } from "lucide-react";
import { PricingSection } from "./paymentCard";

const features = [
  {
    id: 1,
    icon: <Eraser className="w-8 h-8 text-primary" />,
    title: "Automated Data Cleaning",
    desc: "Instantly clean messy datasets fix errors, missing values, and inconsistency in seconds.",
    badge: "Auto Clean",
  },
  {
    id: 2,
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "Smart Duplicate Detection",
    desc: "Identify and remove exact & fuzzy duplicates with intelligent similarity based matching.",
    badge: "AI Matching",
  },
  {
    id: 3,
    icon: <Shuffle className="w-8 h-8 text-primary" />,
    title: "Auto Data Standardization",
    desc: "Standardize names, dates, emails, and formats into a clean, unified structure automatically.",
    badge: "Smart Format",
  },
  {
    id: 4,
    icon: <Link2 className="w-8 h-8 text-primary" />,
    title: "Cross-File Record Matching",
    desc: "Match records between two datasets even when fields don’t align or values differ slightly.",
    badge: "Pro Feature",
  },
];

export default function CardsSection() {
  return (
    <section className="w-full py-16" id="features-section">
      {/* Heading */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Why Choose <span className="text-primary">DataPurify?</span>
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
          Our smart automation helps you clean, standardize, and match data with zero manual effort.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((f) => (
            <div
              key={f.id}
              className="aspect-square w-full p-6 rounded-2xl bg-card border border-border shadow-md 
              flex flex-col items-center justify-between text-center
              transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/30"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4">
                {f.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.desc}
              </p>

              {/* Badge */}
              <span className="mt-4 px-4 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

<section>
  <PricingSection/>
</section>
