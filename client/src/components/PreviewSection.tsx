import TestimonialsSection from "./TestimonialSection";

const PreviewSection = () => {
  return (
    <section
      id="preview-section"
      className="
        w-full
        px-5 sm:px-6
        pt-12 sm:pt-16
        pb-16 sm:pb-20
        text-center
      "
    >
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
          See <span className="text-primary">DataPurify</span> in Action
        </h2>

        {/* Subheading */}
        <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          A quick look at how DataPurify works behind the scenes.
        </p>

        {/* Preview Video */}
        <div className="mt-8 sm:mt-10 flex justify-center">
          <div
            className="
              relative
              w-full max-w-4xl
              rounded-xl sm:rounded-2xl
              overflow-hidden
              border border-border/40
              bg-card
              shadow-lg sm:shadow-xl
            "
          >
            <video
              src="/bhyiiiii.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default PreviewSection;

/* Testimonials */
<TestimonialsSection />
