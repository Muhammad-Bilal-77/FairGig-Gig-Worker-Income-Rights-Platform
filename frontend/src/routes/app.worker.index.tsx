import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { TagBadge } from "@/components/TagBadge";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  ShieldCheck,
  TrendingDown,
  Clock,
  Plus,
  Upload,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { EARNINGS, WEEKLY_TREND, formatPKR } from "@/lib/mock-data";

export const Route = createFileRoute("/app/worker/")({
  head: () => ({ meta: [{ title: "Worker Dashboard — FairGig" }] }),
  component: WorkerHome,
});

function WorkerHome() {
  const recent = EARNINGS.slice(0, 5);
  const verified = EARNINGS.filter((e) => e.status === "verified").reduce((s, e) => s + e.net, 0);
  const total = EARNINGS.reduce((s, e) => s + e.net, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Welcome back, Asim 👋"
        description="Here's a snapshot of your gig income this month."
        actions={
          <>
            <Link to="/app/worker/earnings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="h-4 w-4" /> Upload proof
              </Button>
            </Link>
            <Link to="/app/worker/earnings">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Log shift
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This month"
          value={formatPKR(total)}
          hint="Across 6 platforms"
          icon={Wallet}
          delta={{ value: 12, positiveIsGood: true }}
        />
        <StatCard
          label="Verified"
          value={formatPKR(verified)}
          hint={`${Math.round((verified / total) * 100)}% of earnings`}
          icon={ShieldCheck}
          tone="success"
          delta={{ value: 8, positiveIsGood: true }}
        />
        <StatCard
          label="Avg hourly rate"
          value={formatPKR(412)}
          hint="City median: Rs 480"
          icon={Clock}
          tone="warning"
          delta={{ value: -6, positiveIsGood: true }}
        />
        <StatCard
          label="Income drop alert"
          value="-31%"
          hint="Foodpanda · last 14 days"
          icon={TrendingDown}
          tone="danger"
          delta={{ value: -31, positiveIsGood: true }}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Earnings trend</h3>
              <p className="text-xs text-muted-foreground">Last 8 weeks</p>
            </div>
            <Link to="/app/worker/analytics">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Details <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={WEEKLY_TREND} margin={{ left: -10, right: 5, top: 10 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatPKR(v)}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Anomaly alerts</h3>
          <p className="text-xs text-muted-foreground">AI-detected patterns</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-destructive/20 bg-danger-soft/60 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Income dropped 31%</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Foodpanda reduced per-order pay from Rs 95 → Rs 70 in your zone.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning-soft/60 p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Hourly rate below median</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your Rs 412/hr is 14% under Karachi median.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-success/20 bg-success-soft/60 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">3 new entries verified</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reviewed and approved by Hira S. yesterday.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-semibold">Recent earnings</h3>
            <p className="text-xs text-muted-foreground">Your latest logged shifts</p>
          </div>
          <Link to="/app/worker/earnings">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Platform</th>
                <th className="text-right font-medium px-5 py-3">Hours</th>
                <th className="text-right font-medium px-5 py-3">Net</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-3">{new Date(e.date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</td>
                  <td className="px-5 py-3 font-medium">{e.platform}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{e.hours}h</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">{formatPKR(e.net)}</td>
                  <td className="px-5 py-3">
                    <TagBadge variant={e.status} dot>
                      {e.status}
                    </TagBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
