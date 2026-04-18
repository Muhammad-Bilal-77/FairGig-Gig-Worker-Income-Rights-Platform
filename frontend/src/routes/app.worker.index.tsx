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
import { formatPKR } from "@/lib/mock-data";
import { useEffect, useState, useMemo } from "react";
import { api, WorkerAccount } from "@/lib/api-client";

export const Route = createFileRoute("/app/worker/")({
  head: () => ({ meta: [{ title: "Worker Dashboard — FairGig" }] }),
  component: WorkerHome,
});

function WorkerHome() {
  const [profile, setProfile] = useState<WorkerAccount | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [median, setMedian] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const _profile = await api.getProfile();
        setProfile(_profile);

        const [sumRes, shiftsRes, anomalyRes, medianRes] = await Promise.allSettled([
          api.earnings.getSummary(),
          api.earnings.listShifts({ limit: 100 }),
          api.anomaly.getWorkerAnalysis(_profile.id).catch(() => null),
          api.earnings.getMedian().catch(() => null)
        ]);

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
        if (shiftsRes.status === 'fulfilled') {
          setAllShifts(shiftsRes.value.data);
          setRecent(shiftsRes.value.data.slice(0, 5));
        }
        if (anomalyRes.status === 'fulfilled' && anomalyRes.value) setAnomalies(anomalyRes.value);
        if (medianRes.status === 'fulfilled' && medianRes.value) setMedian(medianRes.value.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const weeklyTrend = useMemo(() => {
    if (!allShifts.length) return [];
    
    const weeks: Record<string, number> = {};
    const now = new Date();
    
    // Generate the last 8 weeks labels precisely using ISO or simple offset
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekLabel = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      weeks[weekLabel] = 0;
    }

    allShifts.forEach(shift => {
      const d = new Date(shift.shift_date);
      const diffTime = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 56) {
        const weekIndex = 7 - Math.floor(diffDays / 7);
        const bucketDate = new Date(now.getTime() - ((7 - weekIndex) * 7 * 24 * 60 * 60 * 1000));
        const weekLabel = `${bucketDate.getDate()} ${bucketDate.toLocaleString('default', { month: 'short' })}`;
        
        if (weeks[weekLabel] !== undefined) {
          weeks[weekLabel] += Number(shift.net_received);
        }
      }
    });

    return Object.entries(weeks).map(([week, earnings]) => ({ week, earnings }));
  }, [allShifts]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading real-time analytics...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const total = summary ? Number(summary.total_net) : 0;
  const verified = summary ? Number(summary.verified_net) : 0;
  const avgRate = summary ? Number(summary.avg_hourly_rate) : 0;
  const platformCount = summary && summary.by_platform ? Object.keys(summary.by_platform).length : 0;
  
  const cityMedian = median && median.length > 0
    ? Math.round(median.reduce((acc: number, curr: any) => acc + (Number(curr.median_hourly_rate) || 0), 0) / median.length)
    : 480;

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />;
      case 'MEDIUM': return <Clock className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />;
    }
  };

  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case 'HIGH': return "rounded-lg border border-destructive/20 bg-danger-soft/60 p-3";
      case 'MEDIUM': return "rounded-lg border border-warning/30 bg-warning-soft/60 p-3";
      default: return "rounded-lg border border-muted bg-muted/20 p-3";
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'Worker'} 👋`}
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
          hint={`Across ${platformCount} platforms`}
          icon={Wallet}
        />
        <StatCard
          label="Verified"
          value={formatPKR(verified)}
          hint={total > 0 ? `${Math.round((verified / total) * 100)}% of earnings` : "0% of earnings"}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Avg hourly rate"
          value={formatPKR(avgRate)}
          hint={`City median: Rs ${cityMedian}`}
          icon={Clock}
          tone={avgRate < cityMedian ? "warning" : "default"}
        />
        {anomalies && anomalies.anomaly_count > 0 ? (
          <StatCard
            label="Anomalies Found"
            value={anomalies.anomaly_count.toString()}
            hint={anomalies.high_count > 0 ? "High severity patterns detected" : "Review suggested"}
            icon={TrendingDown}
            tone={anomalies.high_count > 0 ? "danger" : "warning"}
          />
        ) : (
             <StatCard
               label="Account Health"
               value="Excellent"
               hint="No anomalies detected"
               icon={ShieldCheck}
               tone="success"
             />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant h-[400px] flex flex-col">
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
          <div className="mt-4 flex-1 min-h-0">
            <ResponsiveContainer>
              <AreaChart data={weeklyTrend} margin={{ left: -10, right: 5, top: 10 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v as number) / 1000}k`} />
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

        <div className="rounded-xl border bg-card p-5 shadow-elegant flex flex-col h-[400px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Anomaly alerts</h3>
              <p className="text-xs text-muted-foreground">AI-detected patterns</p>
            </div>
            <div className="bg-primary/10 px-2 py-0.5 rounded text-[10px] font-medium text-primary animate-pulse">
              LIVE UPDATES
            </div>
          </div>
          
          <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {anomalies && anomalies.anomaly_count > 0 ? (
              anomalies.anomalies.map((anomaly: any, idx: number) => (
                <div key={idx} className={getAlertStyle(anomaly.severity)}>
                  <div className="flex items-start gap-2">
                    {getAlertIcon(anomaly.severity)}
                    <div>
                      <div className="text-sm font-medium capitalize">{anomaly.check_name.replace(/_/g, ' ')}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {anomaly.plain_english}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="rounded-lg border border-success/20 bg-success-soft/60 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">All clear</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your earnings patterns look normal and healthy compared to regional baselines.
                      </p>
                    </div>
                  </div>
                </div>
            )}
            {summary && summary.verified_net > 0 && (
              <div className="rounded-lg border border-success/20 bg-success-soft/60 p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Earnings Verified</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You have {formatPKR(verified)} in verified earnings this period.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No recent shifts logged. Log a shift to see it here.
            </div>
          ) : (
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
                    <td className="px-5 py-3">{new Date(e.shift_date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</td>
                    <td className="px-5 py-3 font-medium capitalize">{e.platform.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{Number(e.hours_worked)}h</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatPKR(Number(e.net_received))}</td>
                    <td className="px-5 py-3">
                      <TagBadge 
                        variant={
                          e.verify_status === 'CONFIRMED' ? 'verified' : 
                          e.verify_status === 'FLAGGED' ? 'rejected' : 'pending'
                        } 
                        dot
                      >
                        {e.verify_status.toLowerCase()}
                      </TagBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
