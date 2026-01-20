<Problem/>
import { Zap, Clock, CheckCircle, Download } from "lucide-react";
import PreviewSection from "./PreviewSection";
import Problem from "./problem";

const features = [
  {
    id: 1,
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "Save Hours Instantly",
    desc: "What takes hours in Excel now takes seconds. No formulas, no manual cleanup.",
  },
  {
    id: 2,
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "One-Click Data Cleaning",
    desc: "Upload your CSV or Excel file and get analysis-ready data automatically.",
  },
  {
    id: 3,
    icon: <CheckCircle className="w-8 h-8 text-primary" />,
    title: "Reliable, Clean Data",
    desc: "No hidden errors or inconsistencies — trust your insights and decisions.",
  },
  {
    id: 4,
    icon: <Download className="w-8 h-8 text-primary" />,
    title: "Instant Export",
    desc: "Download your cleaned dataset and continue your workflow immediately.",
  },
];

export default function CardsSection() {
  return (
    <section className="w-full py-16" id="features-section">
      {/* Heading */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          How <span className="text-primary">DataPurify</span> Saves You Hours
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
          Stop fixing data manually. Upload once, get clean data instantly.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f) => (
            <div
              key={f.id}
              className="
                aspect-square w-full p-6 rounded-2xl
                bg-card border border-border
                flex flex-col items-center justify-center text-center
                transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
              "
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4">
                {f.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground">
                {f.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

<PreviewSection/>


          
