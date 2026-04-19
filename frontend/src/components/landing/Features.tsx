import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShieldCheck, FileText, Bell } from "lucide-react";
import { MagicCard } from "./MagicCard";
import { useCountUp } from "@/hooks/use-count-up";

// Lazy-load the heavy Recharts-based chart so it isn't in the initial JS bundle
const EarningsChart = lazy(() => import("./EarningsChart"));

const spring = { type: "spring" as const, stiffness: 100, damping: 15 };

const reveal = {
  hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring },
};

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

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

export function Features() {
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
          variants={grid}
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

function FeatureCard({
  icon: Icon,
  title,
  desc,
  wide,
  extra,
}: {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
  wide?: boolean;
  extra?: React.ReactNode;
}) {
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
