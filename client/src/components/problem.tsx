import {
  AlertTriangle,
  Copy,
  Clock,
  TrendingDown,
} from "lucide-react";

const problems = [
  {
    icon: Copy,
    title: "Duplicate & repeated rows",
    description:
      "Same records appear multiple times, inflating numbers and breaking reports.",
  },
  {
    icon: AlertTriangle,
    title: "Missing or inconsistent values",
    description:
      "Blank cells, broken formats, and mismatched columns make data unreliable.",
  },
  {
    icon: Clock,
    title: "Hours lost in manual cleanup",
    description:
      "Fixing data in Excel eats time before real analysis even begins.",
  },
  {
    icon: TrendingDown,
    title: "Wrong insights & bad decisions",
    description:
      "Small data errors quietly lead to misleading insights and costly mistakes.",
  },
];

export default function Problem() {
  return (
    <section className="relative w-full px-5 pt-14 pb-20 mt--10 sm:px-6 sm:pt-16 sm:pb-24">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
            Messy Data Slows Everything Down         
         </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Most CSV & Excel files aren’t analysis-ready — hours are lost before real work begins
          </p>
        </div>

        {/* Cards */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {problems.map((item, index) => (
            <div
              key={index}
              className="
                relative group
                flex gap-3 sm:gap-4 items-start
                rounded-xl sm:rounded-2xl
                border border-border/40
                bg-gradient-to-br from-card to-muted/20
                p-4 sm:p-5
                transition-all duration-200
                hover:-translate-y-1 hover:shadow-lg
              "
            >
              {/* Icon */}
              <div
                className="
                  shrink-0
                  w-9 h-9 sm:w-10 sm:h-10
                  rounded-lg sm:rounded-xl
                  bg-primary/10 text-primary
                  flex items-center justify-center
                "
              >
                <item.icon size={16} className="sm:hidden" />
                <item.icon size={18} className="hidden sm:block" />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  {item.description}
                </p>
              </div>

              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
