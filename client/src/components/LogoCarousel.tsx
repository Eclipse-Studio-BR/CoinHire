import React from "react";

/**
 * LogoCarousel
 * - Single-line, infinite marquee (no wrapping).
 * - NO borders/backgrounds around logos.
 * - Edit the `logos` array below to add/remove your brands.
 */
export default function LogoCarousel() {
  // 🔧 EDIT THIS LIST with your real logos
  const logos: { src: string; alt: string }[] = [
    { src: "/images/logos/logo-01.svg", alt: "Logo 1" },
    { src: "/images/logos/logo-02.svg", alt: "Logo 2" },
    { src: "/images/logos/logo-03.svg", alt: "Logo 3" },
    { src: "/images/logos/logo-04.svg", alt: "Logo 4" },
    { src: "/images/logos/logo-05.svg", alt: "Logo 5" },
    { src: "/images/logos/logo-06.svg", alt: "Logo 6" },
    { src: "/images/logos/logo-07.svg", alt: "Logo 7" },
    { src: "/images/logos/logo-08.svg", alt: "Logo 8" },
    { src: "/images/logos/logo-09.svg", alt: "Logo 9" },
    { src: "/images/logos/logo-10.svg", alt: "Logo 10" },
    { src: "/images/logos/logo-11.svg", alt: "Logo 11" },
    { src: "/images/logos/logo-12.svg", alt: "Logo 12" },
    { src: "/images/logos/logo-13.svg", alt: "Logo 13" },
    { src: "/images/logos/logo-14.svg", alt: "Logo 14" },
    { src: "/images/logos/logo-15.svg", alt: "Logo 15" },
    { src: "/images/logos/logo-16.svg", alt: "Logo 16" },
    { src: "/images/logos/logo-17.svg", alt: "Logo 17" },
    { src: "/images/logos/logo-18.svg", alt: "Logo 18" },
    { src: "/images/logos/logo-19.svg", alt: "Logo 19" },
    { src: "/images/logos/logo-20.svg", alt: "Logo 20" },
  ];

  // Create tiles (no border/background)
  const tiles = logos.map((logo, i) => (
    <img
      key={i}
      src={logo.src}
      alt={logo.alt}
      className="h-7 md:h-8 w-auto shrink-0 opacity-85 hover:opacity-100 transition-opacity"
      loading="lazy"
      decoding="async"
    />
  ));

  // Duplicate once for seamless loop
  const track = [...tiles, ...tiles];

  return (
    <div
      className="
        group relative mx-auto w-full max-w-6xl overflow-hidden
        rounded-xl
        [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]
        [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]
      "
      aria-label="Trusted by logos"
    >
      <div className="marquee inline-flex whitespace-nowrap items-center gap-8 md:gap-10">
        {track}
      </div>
    </div>
  );
}
