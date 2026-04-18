import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Users, TrendingDown, AlertTriangle, Wallet, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  CITY_INCOME,
  COMMISSION_TREND,
  INCOME_DISTRIBUTION,
  VOLATILITY,
  formatPKR,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/advocate/")({
  head: () => ({ meta: [{ title: "System Analytics — FairGig" }] }),
  component: AdvocateOverview,
});

const tip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function AdvocateOverview() {
  return (
    <PageContainer>
      <PageHeader
        title="System analytics"
        description="Real-time view of gig economy health across Pakistan."
        actions={
          <Link to="/app/advocate/vulnerability">
            <Button variant="outline" size="sm" className="gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" /> 124 at-risk workers
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active workers" value="12,418" hint="Across 6 cities" icon={Users} delta={{ value: 8, positiveIsGood: true }} />
        <StatCard
          label="Avg monthly income"
          value={formatPKR(21340)}
          hint="Median across platforms"
          icon={Wallet}
          delta={{ value: -6, positiveIsGood: true }}
          tone="warning"
        />
        <StatCard
          label="Income volatility"
          value="41 idx"
          hint="Highest in 8 weeks"
          icon={TrendingDown}
          tone="danger"
          delta={{ value: 24, positiveIsGood: false }}
        />
        <StatCard
          label="Open complaints"
          value="389"
          hint="42 escalated"
          icon={AlertTriangle}
          tone="danger"
          delta={{ value: 18, positiveIsGood: false }}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Platform commission trend</h3>
              <p className="text-xs text-muted-foreground">Effective commission % over 6 months</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={COMMISSION_TREND} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line type="monotone" dataKey="Foodpanda" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Careem" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="InDrive" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Income volatility index</h3>
          <p className="text-xs text-muted-foreground">Higher = more unstable income</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={VOLATILITY} margin={{ left: -10, right: 5, top: 10 }}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} />
                <Area type="monotone" dataKey="index" stroke="var(--destructive)" strokeWidth={2} fill="url(#vol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Income distribution</h3>
          <p className="text-xs text-muted-foreground">Number of workers per monthly income bucket (PKR)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={INCOME_DISTRIBUTION} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="workers" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Median income by city</h3>
          <p className="text-xs text-muted-foreground">Monthly net (PKR)</p>
          <div className="mt-4 space-y-3">
            {CITY_INCOME.map((c) => {
              const max = Math.max(...CITY_INCOME.map((x) => x.median));
              const pct = (c.median / max) * 100;
              return (
                <div key={c.city}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.city}</span>
                    <span className="tabular-nums text-muted-foreground">{formatPKR(c.median)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-gradient-to-br from-primary-soft/60 to-card p-5 shadow-elegant">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">
              AI Insight
            </div>
            <h4 className="mt-1 font-semibold">
              Foodpanda complaints ↑ 40% correlated with worker income ↓ 25% in Karachi
            </h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Effective commission moved from 22% to 28% in the last 6 weeks. 312 workers in Karachi
              East zone are reporting per-order pay reduced from Rs 95 to Rs 70. Recommend opening a
              formal inquiry.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm">Open inquiry</Button>
              <Button size="sm" variant="outline">
                Export evidence
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
