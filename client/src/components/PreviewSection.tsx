import TestimonialsSection from "./TestimonialSection";

const PreviewSection = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 pt-10 text-center">
      
      {/* Heading */}
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        See <span className="text-primary">DataPurify</span> in Action
      </h2>

      {/* Subheading / Privacy CTA */}
      <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-base md:text-lg">
       A quick look at how DataPurify works behind the scenes.
      </p>

      {/* CTA Buttons */}
      {/* <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <button
          className="px-6 py-3 rounded-xl bg-primary text-white font-medium
                     hover:opacity-90 transition"
        >
          View Preview
        </button>
      </div> */}

      {/* Preview Image */}
      <div className="flex justify-center">
        <div
          className="relative rounded-2xl overflow-hidden shadow-xl
                     border border-border/40 bg-card
                     w-full max-w-4xl"
        >
          <img
            src="/Previewww.jpg"
            alt="DataPurify dashboard preview"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      </div>

    </section>
  );
};

export default PreviewSection;
<TestimonialsSection/>
