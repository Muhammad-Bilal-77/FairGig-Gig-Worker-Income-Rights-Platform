import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
}

export function MagicCard({ children, className }: Props) {
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
