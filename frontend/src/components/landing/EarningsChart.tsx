import { memo, useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Interactive earnings chart.
 *
 * Performance:
 * - Wrapped in `memo` so re-renders elsewhere on the page don't recompute the SVG.
 * - Static `DATA` is module-level — referentially stable across renders.
 * - Grid hidden, minimal axis labels — fewer DOM nodes.
 *
 * UX:
 * - Smooth (monotone) curve.
 * - Gradient area fill from primary -> transparent.
 * - Custom glassmorphic tooltip + vertical indicator line that follows the cursor.
 *
 * A11y:
 * - role="img" + aria-label on the wrapper so AT users get a meaningful summary.
 */

type Point = { day: number; label: string; value: number };

// 30 days of plausible earnings data
const DATA: Point[] = [
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

const TOTAL = DATA.reduce((s, d) => s + d.value, 0);

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
    <div
      className="
        pointer-events-none rounded-xl border border-white/30 bg-white/70 px-3.5 py-2.5
        shadow-[0_8px_32px_-8px_rgba(37,99,235,0.35)] backdrop-blur-xl
        dark:border-white/10 dark:bg-white/10
      "
    >
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
  // Unique gradient id so multiple instances don't collide
  const gid = useId().replace(/:/g, "");

  return (
    <div
      role="img"
      aria-label={`Earnings over the last 30 days. Total of $${TOTAL.toFixed(0)}, ranging from $${Math.min(...DATA.map((d) => d.value)).toFixed(0)} to $${Math.max(...DATA.map((d) => d.value)).toFixed(0)} per day.`}
      className="h-56 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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

export const EarningsChart = memo(EarningsChartImpl);
export default EarningsChart;
