import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { api } from "@/lib/api-client";
import { Check, Flag, X, ImageIcon, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/verifier/")({
  head: () => ({ meta: [{ title: "Verification Queue - FairGig" }] }),
  component: VerifierQueue,
});

type VerificationStatus = "CONFIRMED" | "FLAGGED" | "UNVERIFIABLE";

interface PendingShift {
  id: string;
  worker_id: string;
  platform: string;
  city_zone: string;
  worker_category: string;
  shift_date: string;
  hours_worked: number | string;
  gross_earned: number | string;
  platform_deduction: number | string;
  net_received: number | string;
  effective_hourly_rate: number | string;
  deduction_rate: number | string;
  screenshot_url: string;
  screenshot_public_id?: string | null;
  verify_status: string;
  import_source: string;
  created_at: string;
  updated_at: string;
  worker_full_name: string | null;
  worker_email: string | null;
  worker_city: string | null;
  worker_profile_city_zone: string | null;
}

function VerifierQueue() {
  const [queue, setQueue] = useState<PendingShift[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? queue[0],
    [queue, selectedId],
  );

  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId("");
      setNote("");
      return;
    }

    if (!selectedId || !queue.some((item) => item.id === selectedId)) {
      setSelectedId(queue[0].id);
      setNote("");
    }
  }, [queue, selectedId]);

  useEffect(() => {
    void loadPendingQueue(true);
  }, []);

  async function loadPendingQueue(initial = false) {
    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await api.earnings.listPendingVerification();
      setQueue(response.data ?? []);
    } catch (err: any) {
      console.error("Failed to load pending verification queue", err);
      setError(
        err?.message || err?.error || "Could not load pending verification records. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleVerification(status: VerificationStatus) {
    if (!selected || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.earnings.verifyShift(selected.id, {
        status,
        note: note.trim() || undefined,
      });

      setQueue((current) => current.filter((item) => item.id !== selected.id));
      setNote("");
    } catch (err: any) {
      console.error("Failed to submit verification", err);
      setError(
        err?.message || err?.error || "Could not submit verification decision. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Verification queue"
        description={`${queue.length} submissions awaiting your review`}
        actions={
          <Button
            variant="outline"
            onClick={() => void loadPendingQueue(false)}
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
          <p className="text-sm text-muted-foreground mt-3">Loading pending verification records...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <p className="text-base font-medium">No pending verification records</p>
          <p className="text-sm text-muted-foreground mt-1">
            All worker submissions with screenshots have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pending submissions
            </div>
            <div className="max-h-160 overflow-y-auto">
              {queue.map((q) => {
                const active = q.id === selected?.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedId(q.id);
                      setNote("");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors flex items-center gap-3",
                      active ? "bg-primary-soft/40" : "hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-md grid place-items-center shrink-0",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate text-sm">
                          {q.worker_full_name || q.worker_email || q.worker_id}
                        </span>
                        <TagBadge variant="pending" dot>
                          pending
                        </TagBadge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {q.platform} | {formatPKR(q.net_received)} | {formatHours(q.hours_worked)}h
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.id}</div>
                  <h3 className="font-semibold mt-0.5">
                    {selected.worker_full_name || "Unnamed worker"}
                  </h3>
                  <div className="text-xs text-muted-foreground">{selected.worker_email || selected.worker_id}</div>
                </div>
                <TagBadge variant="pending" dot>
                  pending
                </TagBadge>
              </div>

              <div className="grid lg:grid-cols-2">
                <div className="bg-muted/30 p-5 border-b lg:border-b-0 lg:border-r">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Submitted screenshot
                  </div>
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <img
                      src={selected.screenshot_url}
                      alt={`Uploaded shift screenshot by ${selected.worker_full_name || selected.worker_id}`}
                      className="w-full h-120 object-contain bg-black/5"
                    />
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Worker and shift record
                    </div>
                    <div className="rounded-lg border divide-y text-sm">
                      <Field label="Worker" value={selected.worker_full_name || "N/A"} />
                      <Field label="Worker email" value={selected.worker_email || "N/A"} />
                      <Field label="Worker city" value={selected.worker_city || "N/A"} />
                      <Field
                        label="Worker zone"
                        value={selected.worker_profile_city_zone || selected.city_zone || "N/A"}
                      />
                      <Field label="Worker ID" value={selected.worker_id} mono />
                      <Field label="Platform" value={selected.platform} />
                      <Field label="Shift date" value={new Date(selected.shift_date).toDateString()} />
                      <Field label="Hours worked" value={`${formatHours(selected.hours_worked)} hours`} />
                      <Field label="Gross earned" value={formatPKR(selected.gross_earned)} />
                      <Field label="Platform deduction" value={formatPKR(selected.platform_deduction)} />
                      <Field label="Net received" value={formatPKR(selected.net_received)} bold />
                      <Field label="Effective hourly rate" value={formatPKR(selected.effective_hourly_rate)} />
                      <Field label="Deduction rate" value={formatPercent(selected.deduction_rate)} />
                      <Field label="Shift category" value={selected.worker_category} />
                      <Field label="Import source" value={selected.import_source} />
                      <Field label="Submitted at" value={new Date(selected.created_at).toLocaleString()} />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Verifier note</div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Add review notes (optional)..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => void handleVerification("CONFIRMED")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => void handleVerification("FLAGGED")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4 text-warning-foreground" />} Flag
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 text-destructive hover:bg-danger-soft"
                      onClick={() => void handleVerification("UNVERIFIABLE")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});

function formatPKR(value: number | string) {
  const amount = Number(value);
  return pkrFormatter.format(Number.isNaN(amount) ? 0 : amount);
}

function formatHours(value: number | string) {
  const hours = Number(value);
  return Number.isNaN(hours) ? "0" : hours.toFixed(2);
}

function formatPercent(value: number | string) {
  const ratio = Number(value);
  if (Number.isNaN(ratio)) {
    return "0.00%";
  }
  return `${(ratio * 100).toFixed(2)}%`;
}

function Field({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm tabular-nums text-right max-w-[60%] break-all",
          mono && "font-mono text-xs",
          bold && "font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
