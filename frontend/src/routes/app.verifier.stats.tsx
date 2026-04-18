import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { ShieldCheck, Target, Award, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/app/verifier/stats")({
  head: () => ({ meta: [{ title: "Verifier Stats — FairGig" }] }),
  component: VerifierStats,
});

const ACTIVITY = [
  { day: "Mon", verified: 24 },
  { day: "Tue", verified: 31 },
  { day: "Wed", verified: 28 },
  { day: "Thu", verified: 35 },
  { day: "Fri", verified: 42 },
  { day: "Sat", verified: 19 },
  { day: "Sun", verified: 12 },
];

function VerifierStats() {
  return (
    <PageContainer>
      <PageHeader
        title="Your verifier stats"
        description="Trust is earned one accurate review at a time."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Records verified" value="1,284" hint="All time" icon={ShieldCheck} />
        <StatCard label="Accuracy" value="98.4%" hint="vs peer review" icon={Target} tone="success" delta={{ value: 2, positiveIsGood: true }} />
        <StatCard label="Trust level" value="Gold" hint="Top 5% of verifiers" icon={Award} tone="warning" />
        <StatCard label="Avg review time" value="42s" hint="-12s vs average" icon={Activity} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">This week's activity</h3>
          <p className="text-xs text-muted-foreground">Records verified per day</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={ACTIVITY} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="verified" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Trust badges</h3>
          <div className="mt-4 space-y-3">
            {[
              { name: "Gold Verifier", desc: "1,000+ accurate reviews", earned: true },
              { name: "Speedster", desc: "Top 10% review speed", earned: true },
              { name: "Defender", desc: "Caught 50+ fraud attempts", earned: true },
              { name: "Platinum Verifier", desc: "5,000+ reviews — keep going", earned: false },
            ].map((b) => (
              <div
                key={b.name}
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  b.earned ? "bg-warning-soft/40 border-warning/30" : "opacity-60"
                }`}
              >
                <Award
                  className={`h-5 w-5 mt-0.5 ${b.earned ? "text-warning-foreground" : "text-muted-foreground"}`}
                />
                <div>
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
