import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { EARNINGS, formatPKR } from "@/lib/mock-data";
import { Check, Flag, X, ImageIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/verifier/")({
  head: () => ({ meta: [{ title: "Verification Queue — FairGig" }] }),
  component: VerifierQueue,
});

function VerifierQueue() {
  const queue = EARNINGS.filter((e) => e.status === "pending" || e.status === "flagged").slice(
    0,
    14,
  );
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? "");
  const selected = queue.find((q) => q.id === selectedId) ?? queue[0];

  return (
    <PageContainer>
      <PageHeader
        title="Verification queue"
        description={`${queue.length} submissions awaiting your review`}
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Queue list */}
        <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
          <div className="px-4 py-3 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Submissions
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {queue.map((q) => {
              const active = q.id === selected?.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
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
                      <span className="font-medium truncate text-sm">{q.workerName}</span>
                      <TagBadge variant={q.status} dot>
                        {q.status}
                      </TagBadge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {q.platform} · {formatPKR(q.net)} · {q.hours}h
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <div className="text-xs text-muted-foreground font-mono">{selected.id}</div>
                <h3 className="font-semibold mt-0.5">{selected.workerName}</h3>
                <div className="text-xs text-muted-foreground">
                  {selected.platform} · {selected.city}
                </div>
              </div>
              <TagBadge variant={selected.status} dot>
                {selected.status}
              </TagBadge>
            </div>

            <div className="grid lg:grid-cols-2">
              {/* Screenshot mock */}
              <div className="bg-muted/30 p-5 border-b lg:border-b-0 lg:border-r">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Submitted screenshot
                </div>
                <div className="aspect-[3/4] rounded-lg border bg-card relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid opacity-30" />
                  <div className="relative p-5 h-full flex flex-col">
                    <div className="text-xs font-semibold">{selected.platform}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Earnings summary · {new Date(selected.date).toDateString()}
                    </div>
                    <div className="mt-6 space-y-2 text-xs">
                      <Row k="Deliveries" v="14" />
                      <Row k="Hours" v={`${selected.hours}h`} />
                      <Row k="Gross" v={formatPKR(selected.gross)} />
                      <Row k="Commission" v={`- ${formatPKR(Math.round(selected.gross * 0.22))}`} />
                      <Row k="Tips" v={formatPKR(180)} />
                    </div>
                    <div className="mt-auto pt-4 border-t">
                      <Row k="Net payout" v={formatPKR(selected.net)} bold />
                    </div>
                  </div>
                </div>
              </div>

              {/* Entered data + actions */}
              <div className="p-5 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Worker-entered data
                  </div>
                  <div className="rounded-lg border divide-y text-sm">
                    <Field label="Platform" value={selected.platform} />
                    <Field label="Date" value={new Date(selected.date).toDateString()} />
                    <Field label="Hours" value={`${selected.hours} hours`} />
                    <Field label="Gross" value={formatPKR(selected.gross)} />
                    <Field label="Deductions" value={formatPKR(selected.deductions)} />
                    <Field label="Net" value={formatPKR(selected.net)} bold />
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Notes
                  </div>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Add a note for the worker (optional)..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="gap-1.5">
                    <Flag className="h-4 w-4 text-warning-foreground" /> Flag
                  </Button>
                  <Button variant="outline" className="gap-1.5 text-destructive hover:bg-danger-soft">
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Worker history:</span>{" "}
                  18 submissions · 16 verified · 1 flagged · 1 rejected
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("tabular-nums", bold && "font-semibold")}>{v}</span>
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-semibold")}>{value}</span>
    </div>
  );
}
