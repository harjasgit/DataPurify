import { Zap, Eraser, BarChart2, Download } from "lucide-react";
import PreviewSection from "./PreviewSection";
import { P } from "framer-motion/dist/types.d-BJcRxCew";
const features = [
  {
    id: 1,
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "Fast Cleaning",
    desc: "Process thousands of rows in seconds with our optimized cleaning engine.",
    
  },
  {
    id: 2,
    icon: <Eraser className="w-8 h-8 text-primary" />,
    title: "Remove Duplicates",
    desc: "Eliminate duplicate entries automatically and keep only clean records.",
    
  },
  {
    id: 3,
    icon: <BarChart2 className="w-8 h-8 text-primary" />,
    title: "Smart Formatting",
    desc: "Standardize dates, names, and numbers automatically for consistency.",
  },
  {
    id: 4,
    icon: <Download className="w-8 h-8 text-primary" />,
    title: "Instant Export",
    desc: "Download cleaned datasets instantly in your preferred format.",
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
          Powerful tool to clean, format, and export your data effortlessly.
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
                
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
<PreviewSection/>


          
