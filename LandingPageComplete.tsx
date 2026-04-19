"use client";

/**
 * Complete Landing Page Component
 * 
 * USAGE:
 * 1. Copy this entire file to your project
 * 2. Import it in your component: import { LandingPage } from './LandingPageComplete'
 * 3. Use it: <LandingPage />
 * 
 * DEPENDENCIES (install these):
 * npm install framer-motion lucide-react recharts
 * 
 * CSS REQUIRED:
 * Add this to your Tailwind CSS config or global styles:
 * - Configure @theme colors for primary, background, foreground, muted, etc.
 * - Add animation keyframes: marquee, float, gradient-x
 * 
 * IMAGES:
 * Place these files in your /public folder:
 * - /public/dashboard-hero.png
 * - /public/fairgig-logo.png
 * - /public/role-worker.png
 * - /public/role-verifier.png
 * - /public/role-advocate.png
 * 
 * Or replace image paths below with your own image URLs.
 */

import React, { 
  useRef, 
  useState, 
  useEffect, 
  type ReactNode, 
  type MouseEvent, 
  type SVGProps,
  lazy,
  Suspense,
  memo,
  useId
} from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useInView } from "framer-motion";
import { ArrowRight, ShieldCheck, TrendingUp, FileText, Bell, Check, Briefcase, Megaphone } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// ============================================================================
// HOOKS
// ============================================================================

function useCountUp(
  end: number,
  { duration = 1800, decimals = 0 }: { duration?: number; decimals?: number } = {},
) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return { ref, value: formatted };
}

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

function MagneticButton({ children, className, strength = 0.35, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.5 });

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  max?: number;
}

function TiltCard({ children, className, max = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const spring = { stiffness: 120, damping: 14, mass: 0.4 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glareX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(sy, [0, 1], ["0%", "100%"]);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
        style={{
          background: useTransform(
            [glareX, glareY] as never,
            ([gx, gy]: string[]) =>
              `radial-gradient(600px circle at ${gx} ${gy}, rgba(255,255,255,0.45), transparent 40%)`,
          ),
        }}
      />
    </motion.div>
  );
}

interface MagicCardProps {
  children: ReactNode;
  className?: string;
}

function MagicCard({ children, className }: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  const reset = () => {
    mx.set(-200);
    my.set(-200);
  };

  const background = useMotionTemplate`radial-gradient(380px circle at ${mx}px ${my}px, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)`;

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`group relative ${className ?? ""}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative h-full rounded-[inherit] bg-surface">{children}</div>
    </div>
  );
}

// ============================================================================
// PLATFORM LOGOS
// ============================================================================

type LogoProps = SVGProps<SVGSVGElement>;

const Uber = (p: LogoProps) => (
  <svg viewBox="0 0 120 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="60" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" letterSpacing="-1.5">Uber</text>
  </svg>
);

const Careem = (p: LogoProps) => (
  <svg viewBox="0 0 140 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="70" y="30" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontStyle="italic" fontSize="26">careem</text>
  </svg>
);

const Bykea = (p: LogoProps) => (
  <svg viewBox="0 0 130 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="65" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-0.5">Bykea</text>
  </svg>
);

const Upwork = (p: LogoProps) => (
  <svg viewBox="0 0 150 40" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="22" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
    <text x="80" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="24" letterSpacing="-0.5">upwork</text>
  </svg>
);

const Fiverr = (p: LogoProps) => (
  <svg viewBox="0 0 130 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="65" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-1">fiverr.</text>
  </svg>
);

const AmazonFlex = (p: LogoProps) => (
  <svg viewBox="0 0 170 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="85" y="26" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">amazon flex</text>
    <path d="M40 32 Q85 42 130 32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const DoorDash = (p: LogoProps) => (
  <svg viewBox="0 0 160 40" fill="currentColor" aria-hidden="true" {...p}>
    <text x="80" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-0.5">DOORDASH</text>
  </svg>
);

const Deliveroo = (p: LogoProps) => (
  <svg viewBox="0 0 160 40" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M14 28 C 14 14, 28 10, 32 22 L 28 32 Z" fill="currentColor" />
    <text x="92" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">deliveroo</text>
  </svg>
);

const Foodpanda = (p: LogoProps) => (
  <svg viewBox="0 0 170 40" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="18" cy="20" r="10" fill="currentColor" />
    <circle cx="15" cy="18" r="2" fill="var(--surface)" />
    <circle cx="21" cy="18" r="2" fill="var(--surface)" />
    <text x="100" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5">foodpanda</text>
  </svg>
);

type Platform = {
  name: string;
  Logo: (props: LogoProps) => React.ReactElement;
  brand: string;
};

const PLATFORMS: Platform[] = [
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

// ============================================================================
// EARNINGS CHART
// ============================================================================

type Point = { day: number; label: string; value: number };

const CHART_DATA: Point[] = [
  { day: 1, label: "Apr 1", value: 86.4 },
  { day: 2, label: "Apr 2", value: 102.1 },
  { day: 3, label: "Apr 3", value: 78.5 },
  { day: 4, label: "Apr 4", value: 124.0 },
  { day: 5, label: "Apr 5", value: 138.75 },
  { day: 6, label: "Apr 6", value: 156.2 },
  { day: 7, label: "Apr 7", value: 142.5 },
  { day: 8, label: "Apr 8", value: 98.4 },
  { day: 9, label: "Apr 9", value: 112.8 },
  { day: 10, label: "Apr 10", value: 145.6 },
  { day: 11, label: "Apr 11", value: 168.2 },
  { day: 12, label: "Apr 12", value: 152.9 },
  { day: 13, label: "Apr 13", value: 134.4 },
  { day: 14, label: "Apr 14", value: 128.0 },
  { day: 15, label: "Apr 15", value: 142.5 },
  { day: 16, label: "Apr 16", value: 178.3 },
  { day: 17, label: "Apr 17", value: 189.7 },
  { day: 18, label: "Apr 18", value: 165.4 },
  { day: 19, label: "Apr 19", value: 148.2 },
  { day: 20, label: "Apr 20", value: 172.6 },
  { day: 21, label: "Apr 21", value: 195.3 },
  { day: 22, label: "Apr 22", value: 184.0 },
  { day: 23, label: "Apr 23", value: 162.5 },
  { day: 24, label: "Apr 24", value: 198.4 },
  { day: 25, label: "Apr 25", value: 215.8 },
  { day: 26, label: "Apr 26", value: 207.2 },
  { day: 27, label: "Apr 27", value: 188.6 },
  { day: 28, label: "Apr 28", value: 224.0 },
  { day: 29, label: "Apr 29", value: 241.5 },
  { day: 30, label: "Apr 30", value: 256.8 },
];

const CHART_TOTAL = CHART_DATA.reduce((s, d) => s + d.value, 0);

function GlassTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="pointer-events-none rounded-xl border border-white/30 bg-white/70 px-3.5 py-2.5 shadow-[0_8px_32px_-8px_rgba(37,99,235,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {p.label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
        ${p.value.toFixed(2)}
      </p>
    </div>
  );
}

function EarningsChartImpl() {
  const gid = useId().replace(/:/g, "");

  return (
    <div
      role="img"
      aria-label={`Earnings over the last 30 days. Total of $${CHART_TOTAL.toFixed(0)}, ranging from $${Math.min(...CHART_DATA.map((d) => d.value)).toFixed(0)} to $${Math.max(...CHART_DATA.map((d) => d.value)).toFixed(0)} per day.`}
      className="h-56 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={CHART_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.55} />
              <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`line-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--primary-glow)" />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="transparent" />

          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={40}
          />

          <Tooltip
            content={<GlassTooltip />}
            cursor={{
              stroke: "var(--primary)",
              strokeWidth: 1.5,
              strokeDasharray: "4 4",
              opacity: 0.7,
            }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={`url(#line-${gid})`}
            strokeWidth={2.5}
            fill={`url(#area-${gid})`}
            activeDot={{
              r: 5,
              fill: "var(--primary)",
              stroke: "var(--surface)",
              strokeWidth: 3,
            }}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const EarningsChart = memo(EarningsChartImpl);

// ============================================================================
// MAIN SECTIONS
// ============================================================================

const spring = { type: "spring" as const, stiffness: 100, damping: 15 };

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: spring },
};

const reveal = {
  hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// NAVBAR
function Navbar({ logo = "/fairgig-logo.png" }) {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2">
            <img src={logo} alt="FairGig" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">FairGig</span>
          </a>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex">
              Sign in
            </button>
            <button className="group inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-all duration-300 hover:opacity-90">
              Get started
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// HERO
function Hero({ dashboardImage = "/dashboard-hero.png" }) {
  const workers = useCountUp(1.2, { decimals: 1, duration: 1600 });

  return (
    <section className="hero-mesh relative overflow-hidden pt-20 pb-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            variants={item}
            className="mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-surface/70 px-4 py-1.5 text-xs font-medium text-foreground shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--primary)_50%,transparent)] backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Built for{" "}
            <span ref={workers.ref} className="tabular-nums">
              {workers.value}M+
            </span>{" "}
            gig workers
          </motion.div>

          <motion.h1
            variants={item}
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            <span className="text-gradient-primary">Know your rights.</span>
            <br />
            Get paid what you earn.
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            FairGig is the all-in-one platform for gig workers to verify income,
            track earnings, and stand up for fair pay — backed by a network of
            verifiers and advocates.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <MagneticButton className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary/90 px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/20 transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/40">
              Open dashboard
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton
              strength={0.2}
              className="group inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors duration-300 hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              Explore as Verifier
            </MagneticButton>
          </motion.div>

          <motion.p variants={item} className="mt-4 text-xs text-muted-foreground">
            Free for workers · No credit card required
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ ...spring, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="absolute inset-x-0 -top-10 mx-auto h-64 w-3/4 rounded-full bg-gradient-to-r from-primary/20 via-primary-glow/20 to-primary/20 blur-3xl" />
          <TiltCard className="relative animate-float rounded-3xl">
            <img
              src={dashboardImage}
              alt="FairGig dashboard mockup"
              width={1280}
              height={1024}
              className="mx-auto w-full max-w-4xl drop-shadow-[0_30px_60px_rgba(37,99,235,0.25)]"
            />
          </TiltCard>
        </motion.div>
      </div>
    </section>
  );
}

// LOGO MARQUEE
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

function LogoMarquee() {
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

// FEATURES
function EarningsCard() {
  const earned = useCountUp(4218.6, { decimals: 2, duration: 1800 });
  return (
    <div className="mt-6 rounded-xl border border-border/80 bg-gradient-to-b from-surface to-muted/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">This month</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            $<span ref={earned.ref}>{earned.value}</span>
          </p>
        </div>
        <div className="rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
          +18.2%
        </div>
      </div>
      <Suspense fallback={<div className="mt-3 h-56 w-full animate-pulse rounded-lg bg-muted/40" />}>
        <div className="mt-3">
          <EarningsChart />
        </div>
      </Suspense>
    </div>
  );
}

function MiniBars() {
  const bars = [40, 70, 55, 85, 65, 95];
  return (
    <div className="mt-6 flex h-24 items-end gap-2 rounded-xl border border-border/80 bg-gradient-to-b from-surface to-muted/40 p-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 origin-bottom rounded-md bg-gradient-to-t from-primary/70 to-primary-glow/70 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform:scaleY(0.15)] group-hover:[transform:scaleY(1)]"
          style={{ height: `${h}%`, transitionDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

function MiniBell() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/80 bg-gradient-to-b from-surface to-muted/40 p-4">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <Bell className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-surface" />
      </div>
      <div className="text-sm">
        <p className="font-semibold">Payout shorted by $14.20</p>
        <p className="text-xs text-muted-foreground">Tap to draft dispute</p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
  wide?: boolean;
  extra?: React.ReactNode;
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  wide,
  extra,
}: FeatureCardProps) {
  return (
    <MagicCard
      className={`h-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] ${wide ? "md:col-span-3" : ""}`}
    >
      <div className="p-7">
        <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="h-5 w-5" />
          <span className="absolute inset-0 -z-10 rounded-xl bg-primary/30 blur-xl opacity-60" />
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
        {extra}
      </div>
    </MagicCard>
  );
}

function Features() {
  return (
    <section id="features" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Features
          </p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Built to protect every shift, every payout.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One toolkit covering income, identity, contracts and alerts —
            designed with workers, verifiers and advocates.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-2"
        >
          <motion.div variants={reveal} className="col-span-1 row-span-2 md:col-span-2">
            <MagicCard className="h-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
              <div className="p-7">
                <div className="flex items-start justify-between">
                  <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/10 text-primary ring-1 ring-inset ring-primary/20">
                    <TrendingUp className="h-5 w-5" />
                    <span className="absolute inset-0 -z-10 rounded-xl bg-primary/30 blur-xl opacity-60" />
                  </div>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Live
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight">
                  Track earnings across every platform
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Auto-import payouts, detect fee anomalies, and forecast cash
                  flow — all in a single, beautifully simple ledger.
                </p>
                <EarningsCard />
              </div>
            </MagicCard>
          </motion.div>

          <motion.div variants={reveal}>
            <FeatureCard
              icon={ShieldCheck}
              title="Verified income proofs"
              desc="Generate tamper-proof income statements accepted by banks, landlords and lenders."
              extra={<MiniBars />}
            />
          </motion.div>
          <motion.div variants={reveal}>
            <FeatureCard
              icon={FileText}
              title="Smart contract scans"
              desc="AI flags unfair terms, hidden fees and rights violations in seconds."
            />
          </motion.div>
        </motion.div>

        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-5"
        >
          <FeatureCard
            icon={Bell}
            title="Real-time anomaly alerts"
            desc="Get notified the moment a payout is late, short, or missing — with one-tap dispute drafting."
            wide
            extra={<MiniBell />}
          />
        </motion.div>
      </div>
    </section>
  );
}

// ROLES
function Roles({ 
  workerImage = "/role-worker.png",
  verifierImage = "/role-verifier.png", 
  advocateImage = "/role-advocate.png"
}) {
  const [active, setActive] = useState("worker");

  const roles = [
    {
      id: "worker",
      title: "Worker",
      desc: "Track shifts, earnings, and fight unfair deductions.",
      icon: Briefcase,
      img: workerImage,
      blurb:
        "Your full earnings history in one place. Auto-detect underpayments and generate verified income statements with one tap.",
    },
    {
      id: "verifier",
      title: "Verifier",
      desc: "Validate income proofs for banks, lenders & landlords.",
      icon: ShieldCheck,
      img: verifierImage,
      blurb:
        "Issue trusted, cryptographically signed income verifications and compliance reports your partners can rely on.",
    },
    {
      id: "advocate",
      title: "Advocate",
      desc: "Support workers, file disputes, push policy change.",
      icon: Megaphone,
      img: advocateImage,
      blurb:
        "Coordinate cases at scale, surface trends across platforms, and turn aggregate data into actionable advocacy.",
    },
  ];

  const bullets = [
    "Built around real worker workflows",
    "End-to-end encrypted & rights-respecting",
    "Transparent fees — no hidden cuts",
  ];

  return (
    <section id="roles" className="bg-gradient-to-b from-background to-muted/40 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              The platform
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              One platform.
              <br />
              <span className="text-gradient-primary">Three roles.</span>
            </h2>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Whether you're earning, verifying, or advocating — FairGig gives
              you the tools and trust signals you need.
            </p>
            <motion.ul
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-8 space-y-4"
            >
              {bullets.map((b) => (
                <motion.li variants={reveal} key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                  </span>
                  <span className="text-foreground">{b}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="space-y-3"
          >
            {roles.map((r) => {
              const isActive = r.id === active;
              const Icon = r.icon;
              return (
                <motion.button
                  key={r.id}
                  variants={reveal}
                  onClick={() => setActive(r.id)}
                  layout
                  transition={spring}
                  className={`group block w-full rounded-2xl border bg-surface p-5 text-left transition-colors duration-300 ${
                    isActive
                      ? "border-primary/60 shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
                      : "border-border hover:border-border/80 hover:shadow-[var(--shadow-card)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <div
                    className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out"
                    style={{
                      gridTemplateRows: isActive ? "1fr" : "0fr",
                      opacity: isActive ? 1 : 0,
                    }}
                  >
                    <div className="min-h-0">
                      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 to-surface p-5">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {r.blurb}
                        </p>
                        <img
                          src={r.img}
                          alt={`${r.title} illustration`}
                          width={120}
                          height={120}
                          loading="eager"
                          decoding="async"
                          className="h-24 w-24 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// CTA
function CTA() {
  const workers = useCountUp(1.2, { decimals: 1 });

  return (
    <section className="px-6 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={spring}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary via-primary to-primary-glow p-12 text-center shadow-glow sm:p-16"
      >
        <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
        <h2 className="text-balance text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
          Your earnings, your rights, your platform.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
          Join{" "}
          <span ref={workers.ref} className="font-semibold tabular-nums">
            {workers.value}M+
          </span>{" "}
          workers using FairGig to take control of their income.
        </p>
        <div className="mt-8 flex justify-center">
          <MagneticButton className="group inline-flex items-center gap-2 rounded-xl bg-surface px-6 py-3.5 text-sm font-semibold text-foreground shadow-lg transition-shadow duration-300">
            Get started
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </MagneticButton>
        </div>
      </motion.div>
    </section>
  );
}

// FOOTER
function Footer({ logo = "/fairgig-logo.png" }) {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <img src={logo} alt="FairGig" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold tracking-tight">FairGig</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FairGig. Building dignity for gig work.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

interface LandingPageProps {
  logo?: string;
  dashboardImage?: string;
  workerImage?: string;
  verifierImage?: string;
  advocateImage?: string;
}

export function LandingPage({
  logo = "/fairgig-logo.png",
  dashboardImage = "/dashboard-hero.png",
  workerImage = "/role-worker.png",
  verifierImage = "/role-verifier.png",
  advocateImage = "/role-advocate.png",
}: LandingPageProps = {}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar logo={logo} />
      <main>
        <Hero dashboardImage={dashboardImage} />
        <LogoMarquee />
        <Features />
        <Roles 
          workerImage={workerImage}
          verifierImage={verifierImage}
          advocateImage={advocateImage}
        />
        <CTA />
      </main>
      <Footer logo={logo} />
    </div>
  );
}

export default LandingPage;
