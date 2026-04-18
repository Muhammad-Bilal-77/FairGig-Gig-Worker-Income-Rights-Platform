import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Printer, ShieldCheck, Sparkles } from "lucide-react";
import { EARNINGS, PLATFORMS, formatPKR } from "@/lib/mock-data";

export const Route = createFileRoute("/app/worker/certificate")({
  head: () => ({ meta: [{ title: "Income Certificate — FairGig" }] }),
  component: Certificate,
});

function Certificate() {
  const verified = EARNINGS.filter((e) => e.status === "verified");
  const total = verified.reduce((s, e) => s + e.net, 0);
  const byPlatform = PLATFORMS.map((p) => ({
    platform: p,
    amount: verified.filter((e) => e.platform === p).reduce((s, e) => s + e.net, 0),
  })).filter((r) => r.amount > 0);

  return (
    <PageContainer>
      <PageHeader
        title="Income certificate"
        description="Generate a verified, printable income proof for banks, landlords or visa offices."
        actions={
          <>
            <Button variant="outline" className="gap-1.5">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button className="gap-1.5">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-elegant">
            <h3 className="font-semibold text-sm">Date range</h3>
            <div className="mt-3 grid gap-3">
              <Select defaultValue="3m">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Last 30 days</SelectItem>
                  <SelectItem value="3m">Last 3 months</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border bg-success-soft/40 border-success/20 p-4">
            <ShieldCheck className="h-5 w-5 text-success" />
            <div className="mt-2 text-sm font-semibold text-success">Verified by FairGig</div>
            <p className="mt-1 text-xs text-muted-foreground">
              All entries on this certificate were independently reviewed against original
              screenshots.
            </p>
          </div>
        </div>

        {/* PDF-style preview */}
        <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
          <div className="bg-gradient-primary text-primary-foreground p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur grid place-items-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-80">FairGig</div>
                  <div className="font-semibold">Income Certificate</div>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="opacity-80">Certificate ID</div>
                <div className="font-mono">FG-2025-04-001284</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Issued to
                </div>
                <div className="mt-1 font-semibold text-base">Asim Raza</div>
                <div className="text-muted-foreground">CNIC: 42101-•••••••-3</div>
                <div className="text-muted-foreground">Karachi, Pakistan</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Period</div>
                <div className="mt-1 font-semibold">Jan 18 – Apr 18, 2025</div>
                <div className="text-muted-foreground">Issued: Apr 18, 2025</div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Total verified earnings
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{formatPKR(total)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Across {verified.length} verified shifts on {byPlatform.length} platforms
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Platform breakdown
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-2">Platform</th>
                      <th className="text-right font-medium px-4 py-2">Verified earnings</th>
                      <th className="text-right font-medium px-4 py-2">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPlatform.map((row) => (
                      <tr key={row.platform} className="border-t">
                        <td className="px-4 py-2 font-medium">{row.platform}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatPKR(row.amount)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {Math.round((row.amount / total) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t text-xs text-muted-foreground">
              <div>
                <div className="font-medium text-foreground">Verification authority</div>
                FairGig Independent Verification Network
              </div>
              <div className="text-right">
                <div className="font-medium text-foreground">Authenticate at</div>
                fairgig.pk/verify/FG-2025-04-001284
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
