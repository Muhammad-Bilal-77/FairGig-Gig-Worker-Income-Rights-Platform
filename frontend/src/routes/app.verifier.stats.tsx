import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { api, type VerifierStatsResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Target, Award, Activity, Loader2, RefreshCw, Clock3, AlertTriangle } from "lucide-react";
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

const EMPTY_STATS: VerifierStatsResponse = {
  total_reviewed_by_you: 0,
  approved_by_you: 0,
  flagged_by_you: 0,
  rejected_by_you: 0,
  approval_rate: 0,
  avg_review_seconds: 0,
  pending_queue_count: 0,
  total_reviewed_global: 0,
  days: 7,
  weekly_activity: [],
  top_platforms: [],
};

function VerifierStats() {
  const [stats, setStats] = useState<VerifierStatsResponse>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStats(true);
  }, []);

  async function loadStats(initial = false) {
    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await api.earnings.getVerifierStats(7);
      setStats(response.data || EMPTY_STATS);
    } catch (err: any) {
      console.error("Failed to load verifier stats", err);
      setError(err?.message || err?.error || "Could not load verifier stats.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const chartData = useMemo(
    () =>
      stats.weekly_activity.map((item) => ({
        day: dayNameFromIso(item.date),
        reviewed: item.reviewed,
      })),
    [stats.weekly_activity],
  );

  const totalDecisions =
    stats.approved_by_you + stats.flagged_by_you + stats.rejected_by_you;

  const statusMix = [
    { key: "Approved", value: stats.approved_by_you, tone: "success" as const },
    { key: "Flagged", value: stats.flagged_by_you, tone: "warning" as const },
    { key: "Rejected", value: stats.rejected_by_you, tone: "danger" as const },
  ].map((item) => ({
    ...item,
    pct: totalDecisions > 0 ? (item.value / totalDecisions) * 100 : 0,
  }));

  const activeDaysThisWeek = stats.weekly_activity.filter((d) => d.reviewed > 0).length;

  const badges = [
    {
      name: "Gold Verifier",
      desc: "Complete 100 reviews",
      earned: stats.total_reviewed_by_you >= 100,
      progressLabel: `${Math.min(stats.total_reviewed_by_you, 100)}/100`,
    },
    {
      name: "Speedster",
      desc: "Avg review time under 90s (min 20 reviews)",
      earned: stats.total_reviewed_by_you >= 20 && stats.avg_review_seconds > 0 && stats.avg_review_seconds <= 90,
      progressLabel:
        stats.total_reviewed_by_you < 20
          ? `${stats.total_reviewed_by_you}/20 reviews`
          : `${Math.round(stats.avg_review_seconds)}s avg`,
    },
    {
      name: "Defender",
      desc: "Flag 10 suspicious submissions",
      earned: stats.flagged_by_you >= 10,
      progressLabel: `${Math.min(stats.flagged_by_you, 10)}/10`,
    },
    {
      name: "Consistency",
      desc: "Review activity on 5 days this week",
      earned: activeDaysThisWeek >= 5,
      progressLabel: `${activeDaysThisWeek}/5 days`,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Your verifier stats"
        description="Live verification performance based on real submissions and review actions."
        actions={
          <Button
            variant="outline"
            onClick={() => void loadStats(false)}
            disabled={isLoading || isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Loading verifier analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Records verified"
              value={formatInt(stats.total_reviewed_by_you)}
              hint="All time by you"
              icon={ShieldCheck}
            />
            <StatCard
              label="Approval rate"
              value={`${stats.approval_rate.toFixed(1)}%`}
              hint={`${formatInt(stats.approved_by_you)} approvals from ${formatInt(totalDecisions)} decisions`}
              icon={Target}
              tone="success"
            />
            <StatCard
              label="Pending queue"
              value={formatInt(stats.pending_queue_count)}
              hint="Submissions waiting review"
              icon={AlertTriangle}
              tone={stats.pending_queue_count > 25 ? "warning" : "default"}
            />
            <StatCard
              label="Avg review time"
              value={formatDuration(stats.avg_review_seconds)}
              hint="Created to verified"
              icon={Clock3}
              tone={stats.avg_review_seconds > 120 ? "warning" : "default"}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
              <h3 className="font-semibold">This week&apos;s activity</h3>
              <p className="text-xs text-muted-foreground">
                Records verified per day ({stats.timezone || "local timezone"})
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ left: -10, right: 5, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="reviewed" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top platforms reviewed</div>
                {stats.top_platforms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviewed records yet.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.top_platforms.map((item) => (
                      <div key={item.platform} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.platform}</span>
                        <span className="tabular-nums text-muted-foreground">{formatInt(item.reviews)} reviews</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-elegant">
              <h3 className="font-semibold">Status mix</h3>
              <div className="mt-4 space-y-3">
                {statusMix.map((item) => (
                  <div key={item.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{item.key}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatInt(item.value)} ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <progress
                        className={[
                          "h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted",
                          item.tone === "success"
                            ? "[&::-webkit-progress-value]:bg-success [&::-moz-progress-bar]:bg-success"
                            : item.tone === "warning"
                              ? "[&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning"
                              : "[&::-webkit-progress-value]:bg-destructive [&::-moz-progress-bar]:bg-destructive",
                        ].join(" ")}
                        max={100}
                        value={Math.max(item.pct, item.pct > 0 ? 6 : 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="font-semibold">Trust badges</h3>
                <div className="mt-3 space-y-3">
                  {badges.map((b) => (
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
                        <div className="text-[11px] mt-1 text-muted-foreground">{b.progressLabel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

function dayNameFromIso(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((part) => Number(part));
  if (!y || !m || !d) {
    return isoDate;
  }
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short" });
}

function formatInt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) {
    return "0s";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
