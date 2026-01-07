import EarlyWaitlistSection from "./emailWaitlistSection";

const testimonials = [
  {
    quote:
      "I really liked how easy it was to remove unwanted rows. It saved me time and made data cleaning effortless.",
    name: "Pavan Satya",
    initials: "PS",
    rating: 4,
  },
  {
    quote: "Easy to use and works well.",
    name: "Mukesh Yadav",
    initials: "MY",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-20" id="testimonials-section">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Loved by <span className="text-primary">Early Users</span>
      </h2>

      <p className="text-gray-600 dark:text-gray-300 text-center mb-12 max-w-xl mx-auto">
        Here’s what our beta testers are saying about DataPurify.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="
              rounded-2xl p-6
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              shadow-md transition
              hover:-translate-y-1 hover:shadow-lg
            "
          >
            {/* Profile */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white
                              flex items-center justify-center text-sm font-semibold">
                {t.initials}
              </div>

              <div>
                <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
                  {t.name}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div
              className="flex gap-1 mb-4 text-yellow-400"
              aria-label={`${t.rating} star rating`}
            >
              {[...Array(t.rating)].map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>

            {/* Quote */}
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              “{t.quote}”
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;

<EarlyWaitlistSection/>