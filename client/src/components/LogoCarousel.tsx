import React from "react";

/**
 * LogoCarousel
 * - Single-line, infinite marquee (no wrapping).
 * - Uniform tile width so spacing is consistent across different aspect ratios.
 * - All logos are forced to white via the .logo-white helper class.
 * - Edit the `logos` array to add/remove brands.
 */
export default function LogoCarousel() {
  const logos: { src: string; alt: string }[] = [
    { src: "/images/logos/coinbase.svg", alt: "coinbase" },
    { src: "/images/logos/trezor.svg", alt: "trezor" },
    { src: "/images/logos/chronicle-labs.svg", alt: "chronicle-labs" },
    { src: "/images/logos/algorand.svg", alt: "algorand" },
    { src: "/images/logos/chainalysis.svg", alt: "chainalysis" },
    { src: "/images/logos/stake-fish.svg", alt: "stake-fish" },
    { src: "/images/logos/ark-invest.svg", alt: "ark-invest" },
    { src: "/images/logos/bitrefill.svg", alt: "bitrefill" },
    { src: "/images/logos/p2p.svg", alt: "p2p" },
    { src: "/images/logos/cmc.svg", alt: "coinmarketcap" },
    { src: "/images/logos/chainlink.svg", alt: "chainlink" },
    { src: "/images/logos/binance.svg", alt: "binance" },
  ];

  // Uniform tiles: same width for consistent spacing; logos scale to a fixed height
  const tiles = logos.map((logo, i) => (
    <div
      key={i}
      className="h-10 md:h-11 w-28 md:w-32 shrink-0 flex items-center justify-center"
    >
      <img
        src={logo.src}
        alt={logo.alt}
        className="logo-white h-7 md:h-8 w-auto max-w-full opacity-90 hover:opacity-100 transition-opacity"
        loading="lazy"
        decoding="async"
      />
    </div>
  ));

  
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
