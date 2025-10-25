import React from "react";

type LogoCarouselProps = {
  // File names (no path) you placed under /public/logos/chains
  // Duplicate/extend freely — we’ll auto-loop seamlessly.
  logos?: string[];
  height?: number; // px
  gapClassName?: string; // Tailwind gap override
};

export const LogoCarousel: React.FC<LogoCarouselProps> = ({
  logos = ["ethereum.svg","solana.svg","avalanche.svg","polygon.svg","bitcoin.svg","base.svg"],
  height = 28,
  gapClassName = "gap-6",
}) => {
  // Duplicate the list so that shifting -50% yields a seamless loop.
  const track = [...logos, ...logos];

  return (
    <div className="relative mt-6 overflow-hidden">
      <div
        className={`marquee ${gapClassName}`}
        style={{ height }}
      >
        {track.map((file, i) => (
          <div
            key={`${file}-${i}`}
            className="flex items-center justify-center rounded-md bg-muted px-5"
            style={{ height }}
          >
            {/* public assets resolve from root: /logos/chains/... */}
            <img
              src={`/logos/chains/${file}`}
              alt={file.replace(".svg", "")}
              className="opacity-80"
              style={{ height: height * 0.8 }}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
