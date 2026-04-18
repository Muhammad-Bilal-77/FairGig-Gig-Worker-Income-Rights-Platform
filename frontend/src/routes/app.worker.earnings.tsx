import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { TagBadge } from "@/components/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EARNINGS, PLATFORMS, formatPKR } from "@/lib/mock-data";
import { Upload, FileSpreadsheet, Search } from "lucide-react";

export const Route = createFileRoute("/app/worker/earnings")({
  head: () => ({ meta: [{ title: "Earnings — FairGig" }] }),
  component: EarningsPage,
});

function EarningsPage() {
  const [platform, setPlatform] = useState<string>("");
  const [hours, setHours] = useState("");
  const [gross, setGross] = useState("");
  const [deductions, setDeductions] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dragActive, setDragActive] = useState(false);

  const net = useMemo(() => {
    const g = Number(gross) || 0;
    const d = Number(deductions) || 0;
    return Math.max(0, g - d);
  }, [gross, deductions]);

  const filtered = EARNINGS.filter(
    (e) =>
      (status === "all" || e.status === status) &&
      (search === "" ||
        e.platform.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Earnings"
        description="Log shifts, upload screenshots, and track verification status."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Log a new shift</h3>
          <p className="text-xs text-muted-foreground">Net pay is calculated automatically.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Hours worked</Label>
              <Input
                type="number"
                placeholder="e.g. 8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Gross earnings (PKR)</Label>
              <Input
                type="number"
                placeholder="e.g. 3200"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Deductions (PKR)</Label>
              <Input
                type="number"
                placeholder="commission, fuel, etc."
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Net received</Label>
              <div className="h-9 rounded-md border bg-muted/50 px-3 flex items-center text-sm font-semibold tabular-nums">
                {formatPKR(net)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Label>Upload screenshot</Label>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              className={`mt-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragActive ? "border-primary bg-primary-soft/40" : "border-border bg-muted/20"
              }`}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Drop screenshot or click to upload</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button>Save shift</Button>
            <Button variant="outline" className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Bulk CSV upload
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">This week</h3>
          <p className="text-xs text-muted-foreground">Mon — Sun</p>
          <div className="mt-4 space-y-3">
            <Row label="Total gross" value={formatPKR(18200)} />
            <Row label="Deductions" value={`- ${formatPKR(4100)}`} />
            <div className="border-t pt-3">
              <Row label="Net received" value={formatPKR(14100)} bold />
            </div>
            <Row label="Hours logged" value="42 h" />
            <Row label="Effective rate" value={`${formatPKR(336)}/h`} />
          </div>
          <div className="mt-5 rounded-lg bg-warning-soft/60 border border-warning/30 p-3 text-xs">
            <span className="font-medium">Heads up: </span>
            Foodpanda commission jumped from 22% → 28% this week.
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b">
          <div>
            <h3 className="font-semibold">All earnings logs</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search platform or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-56"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">ID</th>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Platform</th>
                <th className="text-right font-medium px-5 py-3">Hours</th>
                <th className="text-right font-medium px-5 py-3">Gross</th>
                <th className="text-right font-medium px-5 py-3">Net</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                  <td className="px-5 py-3">
                    {new Date(e.date).toLocaleDateString("en-PK", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 font-medium">{e.platform}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{e.hours}h</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatPKR(e.gross)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {formatPKR(e.net)}
                  </td>
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-base" : ""}`}>{value}</span>
    </div>
  );
}
