import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "@/components/TagBadge";
import { api, type VerificationSubmission } from "@/lib/api-client";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/verifier/")({
  head: () => ({ meta: [{ title: "Submissions - FairGig" }] }),
  component: VerifierSubmissions,
});

type VerificationDecision = "CONFIRMED" | "FLAGGED" | "UNVERIFIABLE";
type StatusAlias = "APPROVED" | "REJECTED" | "FLAGGED" | "PENDING";

const STATUS_OPTIONS: Array<{ alias: StatusAlias; label: string }> = [
  { alias: "APPROVED", label: "Approved" },
  { alias: "REJECTED", label: "Rejected" },
  { alias: "FLAGGED", label: "Flagged" },
  { alias: "PENDING", label: "Pending" },
];

const DEFAULT_STATUSES: StatusAlias[] = ["APPROVED", "REJECTED", "FLAGGED"];
const PAGE_SIZE = 30;

function VerifierSubmissions() {
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [cityZone, setCityZone] = useState("");
  const [workerCategory, setWorkerCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [onlyWithScreenshot, setOnlyWithScreenshot] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusAlias[]>(DEFAULT_STATUSES);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => submissions.find((q) => q.id === selectedId) ?? submissions[0],
    [submissions, selectedId],
  );

  useEffect(() => {
    if (submissions.length === 0) {
      setSelectedId("");
      setNote("");
      return;
    }

    if (!selectedId || !submissions.some((item) => item.id === selectedId)) {
      setSelectedId(submissions[0].id);
      setNote("");
    }
  }, [submissions, selectedId]);

  useEffect(() => {
    void loadSubmissions(true);
  }, [offset]);

  async function loadSubmissions(initial = false) {
    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await api.earnings.listSubmissions({
        statuses: selectedStatuses,
        worker_query: search.trim() || undefined,
        platform: platform.trim() || undefined,
        city_zone: cityZone.trim() || undefined,
        worker_category: workerCategory.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        only_with_screenshot: onlyWithScreenshot,
        limit: PAGE_SIZE,
        offset,
      });

      setSubmissions(response.data ?? []);
      setTotal(Number(response.meta?.total ?? 0));
    } catch (err: any) {
      console.error("Failed to load submissions", err);
      setError(err?.message || err?.error || "Could not load submissions. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function toggleStatusFilter(status: StatusAlias) {
    setOffset(0);
    setSelectedStatuses((current) => {
      if (current.includes(status)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== status);
      }
      return [...current, status];
    });
  }

  async function applyFilters() {
    setOffset(0);
    await loadSubmissions(false);
  }

  async function handleVerification(status: VerificationDecision) {
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

      setNote("");
      await loadSubmissions(false);
    } catch (err: any) {
      console.error("Failed to submit verification", err);
      setError(err?.message || err?.error || "Could not submit verification decision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + submissions.length, total);

  return (
    <PageContainer>
      <PageHeader
        title="Submission reviews"
        description={`Showing ${pageStart}-${pageEnd} of ${total} submissions`}
        actions={
          <Button
            variant="outline"
            onClick={() => void loadSubmissions(false)}
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

      <div className="mb-4 rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Worker name, email, shift or worker id"
              className="pl-9"
            />
          </div>
          <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Platform" />
          <Input value={cityZone} onChange={(e) => setCityZone(e.target.value)} placeholder="City zone" />
          <Input
            value={workerCategory}
            onChange={(e) => setWorkerCategory(e.target.value)}
            placeholder="Worker category"
          />
          <Input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" />
          <Input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" />
          <Button
            variant={onlyWithScreenshot ? "default" : "outline"}
            onClick={() => setOnlyWithScreenshot((current) => !current)}
          >
            {onlyWithScreenshot ? "With screenshots only" : "Include no-screenshot"}
          </Button>
          <Button className="gap-2" onClick={() => void applyFilters()}>
            <Search className="h-4 w-4" />
            Apply filters
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => {
            const active = selectedStatuses.includes(status.alias);
            return (
              <Button
                key={status.alias}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => toggleStatusFilter(status.alias)}
              >
                {status.label}
              </Button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <p className="text-base font-medium">No submissions found</p>
          <p className="text-sm text-muted-foreground mt-1">Adjust your filters and try again.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Submissions
            </div>
            <div className="max-h-160 overflow-y-auto">
              {submissions.map((submission) => {
                const active = submission.id === selected?.id;
                const statusLabel = statusToLabel(submission.verify_status);
                return (
                  <button
                    key={submission.id}
                    onClick={() => {
                      setSelectedId(submission.id);
                      setNote(submission.verifier_note || "");
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
                          {submission.worker_full_name || submission.worker_email || submission.worker_id}
                        </span>
                        <TagBadge variant={statusToBadgeVariant(submission.verify_status)} dot>
                          {statusLabel}
                        </TagBadge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {submission.platform} | {formatPKR(submission.net_received)} | {formatHours(submission.hours_worked)}h
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                {pageStart}-{pageEnd} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.id}</div>
                  <h3 className="font-semibold mt-0.5">{selected.worker_full_name || "Unnamed worker"}</h3>
                  <div className="text-xs text-muted-foreground">{selected.worker_email || selected.worker_id}</div>
                </div>
                <TagBadge variant={statusToBadgeVariant(selected.verify_status)} dot>
                  {statusToLabel(selected.verify_status)}
                </TagBadge>
              </div>

              <div className="grid lg:grid-cols-2">
                <div className="bg-muted/30 p-5 border-b lg:border-b-0 lg:border-r">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Submitted screenshot</div>
                  {selected.screenshot_url ? (
                    <div className="rounded-lg border bg-card overflow-hidden">
                      <img
                        src={selected.screenshot_url}
                        alt={`Uploaded shift screenshot by ${selected.worker_full_name || selected.worker_id}`}
                        className="w-full h-120 object-contain bg-black/5"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">No screenshot attached.</div>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Submission details</div>
                    <div className="rounded-lg border divide-y text-sm">
                      <Field label="Worker" value={selected.worker_full_name || "N/A"} />
                      <Field label="Worker email" value={selected.worker_email || "N/A"} />
                      <Field label="Worker city" value={selected.worker_city || "N/A"} />
                      <Field label="Worker zone" value={selected.worker_profile_city_zone || selected.city_zone || "N/A"} />
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
                      <Field label="Submitted at" value={new Date(selected.created_at).toLocaleString()} />
                      <Field
                        label="Reviewed at"
                        value={selected.verified_at ? new Date(selected.verified_at).toLocaleString() : "Not reviewed"}
                      />
                      <Field
                        label="Reviewed by"
                        value={selected.verifier_full_name || selected.verifier_email || "Not assigned"}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Verifier note</div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Add review notes (optional)..."
                      disabled={selected.verify_status !== "PENDING"}
                    />
                  </div>

                  {selected.verify_status === "PENDING" ? (
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
                  ) : (
                    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      This submission is already reviewed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function statusToLabel(status: string): string {
  if (status === "CONFIRMED") return "Approved";
  if (status === "UNVERIFIABLE") return "Rejected";
  if (status === "FLAGGED") return "Flagged";
  if (status === "PENDING") return "Pending";
  return status;
}

function statusToBadgeVariant(status: string): "success" | "danger" | "warning" | "pending" | "neutral" {
  if (status === "CONFIRMED") return "success";
  if (status === "UNVERIFIABLE") return "danger";
  if (status === "FLAGGED") return "warning";
  if (status === "PENDING") return "pending";
  return "neutral";
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
