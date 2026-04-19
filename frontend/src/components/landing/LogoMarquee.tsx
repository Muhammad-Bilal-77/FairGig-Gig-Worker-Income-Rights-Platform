import { memo } from "react";
import { PLATFORMS, type Platform } from "./PlatformLogos";

/**
 * Pure-CSS infinite marquee.
 *
 * Performance:
 * - Animation runs on `transform: translateX` (GPU compositor — no layout/paint thrash).
 * - No JS loop, no setInterval, no IntersectionObserver overhead.
 * - `animation-play-state: paused` is toggled via the `:hover` selector
 *   on the container (see `.marquee-container:hover .marquee-track`).
 *
 * Accessibility:
 * - The full list is rendered once with a label for AT users.
 * - The visible marquee track + its duplicate are `aria-hidden` so screen
 *   readers don't repeat the platform list twice.
 */
function LogoItem({ platform }: { platform: Platform }) {
  const { Logo, brand } = platform;
  return (
    <li
      className="logo-item group/logo flex h-12 w-40 shrink-0 items-center justify-center"
      style={{ ["--brand" as string]: brand }}
    >
      <Logo
        className="
          h-8 w-auto
          text-foreground/40
          transition-all duration-300 ease-out
          group-hover/logo:scale-110
          group-hover/logo:[color:var(--brand)]
          group-hover/logo:drop-shadow-[0_4px_12px_color-mix(in_oklab,var(--brand)_45%,transparent)]
        "
      />
    </li>
  );
}

const Track = memo(function Track() {
  // Two passes for seamless looping (translateX(-50%) lands on the duplicate boundary).
  return (
    <ul className="marquee-track gap-16 px-8" aria-hidden="true">
      {PLATFORMS.map((p) => (
        <LogoItem key={`a-${p.name}`} platform={p} />
      ))}
      {PLATFORMS.map((p) => (
        <LogoItem key={`b-${p.name}`} platform={p} />
      ))}
    </ul>
  );
});

export function LogoMarquee() {
  return (
    <section
      aria-labelledby="platforms-heading"
      className="border-y border-border/60 bg-surface/50 py-14"
    >
      <div className="mx-auto max-w-7xl px-6">
        <p
          id="platforms-heading"
          className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Trusted by workers across leading gig platforms
        </p>

        {/* Single accessible list for screen readers */}
        <ul className="sr-only">
          {PLATFORMS.map((p) => (
            <li key={p.name}>{p.name}</li>
          ))}
        </ul>

        <div className="marquee-container marquee-mask relative overflow-hidden">
          <Track />
        </div>
      </div>
    </section>
  );
}
