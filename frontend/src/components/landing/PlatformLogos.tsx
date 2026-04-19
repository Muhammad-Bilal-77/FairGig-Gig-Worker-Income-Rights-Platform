/**
 * Monochrome wordmark/logo SVGs for gig platforms.
 * Each logo uses `currentColor` for the default monochrome look,
 * and exposes a `--brand` CSS variable that activates on hover via
 * the parent `.logo-item` class.
 *
 * Marked aria-hidden — the marquee announces "Supported platforms"
 * via the section heading; duplicated logos must not be re-announced.
 */
import type { SVGProps, ReactElement } from "react";

type LogoProps = SVGProps<SVGSVGElement>;

export const Uber = (p: LogoProps) => (
  <svg viewBox="0 0 120 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="60" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" letterSpacing="-1.5">Uber</text>
  </svg>
);

export const Careem = (p: LogoProps) => (
  <svg viewBox="0 0 140 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="70" y="30" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontStyle="italic" fontSize="26">careem</text>
  </svg>
);

export const Bykea = (p: LogoProps) => (
  <svg viewBox="0 0 130 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="65" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-0.5">Bykea</text>
  </svg>
);

export const Upwork = (p: LogoProps) => (
  <svg viewBox="0 0 150 40" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="22" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
    <text x="80" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="24" letterSpacing="-0.5">upwork</text>
  </svg>
);

export const Fiverr = (p: LogoProps) => (
  <svg viewBox="0 0 130 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="65" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-1">fiverr.</text>
  </svg>
);

export const AmazonFlex = (p: LogoProps) => (
  <svg viewBox="0 0 170 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="85" y="26" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">amazon flex</text>
    <path d="M40 32 Q85 42 130 32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export const DoorDash = (p: LogoProps) => (
  <svg viewBox="0 0 160 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="80" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-0.5">DOORDASH</text>
  </svg>
);

export const Deliveroo = (p: LogoProps) => (
  <svg viewBox="0 0 160 40" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M14 28 C 14 14, 28 10, 32 22 L 28 32 Z" fill="currentColor" />
    <text x="92" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">deliveroo</text>
  </svg>
);

export const Foodpanda = (p: LogoProps) => (
  <svg viewBox="0 0 170 40" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="18" cy="20" r="10" fill="currentColor" />
    <circle cx="15" cy="18" r="2" fill="var(--surface)" />
    <circle cx="21" cy="18" r="2" fill="var(--surface)" />
    <text x="100" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">foodpanda</text>
  </svg>
);

export type Platform = {
  name: string;
  Logo: (props: LogoProps) => ReactElement;
  /** Official-ish brand color, applied on hover */
  brand: string;
};

export const PLATFORMS: Platform[] = [
  { name: "Uber", Logo: Uber, brand: "#000000" },
  { name: "Careem", Logo: Careem, brand: "#0FA855" },
  { name: "Bykea", Logo: Bykea, brand: "#FFD700" },
  { name: "Upwork", Logo: Upwork, brand: "#14A800" },
  { name: "Fiverr", Logo: Fiverr, brand: "#1DBF73" },
  { name: "Amazon Flex", Logo: AmazonFlex, brand: "#FF9900" },
  { name: "DoorDash", Logo: DoorDash, brand: "#EB1700" },
  { name: "Deliveroo", Logo: Deliveroo, brand: "#00CCBC" },
  { name: "Foodpanda", Logo: Foodpanda, brand: "#D70F64" },
];
