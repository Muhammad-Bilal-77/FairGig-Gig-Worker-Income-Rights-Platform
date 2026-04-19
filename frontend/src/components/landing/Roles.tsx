import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Briefcase, ShieldCheck, Megaphone } from "lucide-react";
import worker from "@/assets/role-worker.png";
import verifier from "@/assets/role-verifier.png";
import advocate from "@/assets/role-advocate.png";

const roles = [
  {
    id: "worker",
    title: "Worker",
    desc: "Track shifts, earnings, and fight unfair deductions.",
    icon: Briefcase,
    img: worker,
    blurb:
      "Your full earnings history in one place. Auto-detect underpayments and generate verified income statements with one tap.",
  },
  {
    id: "verifier",
    title: "Verifier",
    desc: "Validate income proofs for banks, lenders & landlords.",
    icon: ShieldCheck,
    img: verifier,
    blurb:
      "Issue trusted, cryptographically signed income verifications and compliance reports your partners can rely on.",
  },
  {
    id: "advocate",
    title: "Advocate",
    desc: "Support workers, file disputes, push policy change.",
    icon: Megaphone,
    img: advocate,
    blurb:
      "Coordinate cases at scale, surface trends across platforms, and turn aggregate data into actionable advocacy.",
  },
];

const bullets = [
  "Built around real worker workflows",
  "End-to-end encrypted & rights-respecting",
  "Transparent fees — no hidden cuts",
];

const spring = { type: "spring" as const, stiffness: 100, damping: 15 };

const reveal = {
  hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export function Roles() {
  const [active, setActive] = useState("worker");

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
