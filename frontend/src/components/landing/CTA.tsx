import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { useCountUp } from "@/hooks/use-count-up";

const spring = { type: "spring" as const, stiffness: 100, damping: 15 };

export function CTA() {
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
