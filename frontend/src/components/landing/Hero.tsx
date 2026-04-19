import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import dashboard from "@/assets/dashboard-hero.png";
import { MagneticButton } from "./MagneticButton";
import { TiltCard } from "./TiltCard";
import { useCountUp } from "@/hooks/use-count-up";

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

export function Hero() {
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
              src={dashboard}
              alt="FairGig dashboard mockup with verified income chart and anomaly alerts"
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
