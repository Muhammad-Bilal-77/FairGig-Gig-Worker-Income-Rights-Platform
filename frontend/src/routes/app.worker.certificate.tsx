import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader, Printer, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatPKR } from "@/lib/mock-data";

export const Route = createFileRoute("/app/worker/certificate")({
  head: () => ({ meta: [{ title: "Income Certificate — FairGig" }] }),
  component: Certificate,
});

type DatePreset = "1m" | "3m" | "6m" | "1y";

interface CertificateListItem {
  id: string;
  cert_ref: string;
  worker_name?: string;
  date_from: string;
  date_to: string;
  total_net: number;
  shift_count: number;
  verified_count: number;
  created_at: string;
  view_url?: string;
}

interface CertificateSummary {
  cert_ref: string;
  worker_name?: string;
  date_from: string;
  date_to: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_hours: number;
  shift_count: number;
  verified_count: number;
  platform_breakdown?: Record<string, number | string>;
  created_at?: string;
}

function getRangeFromPreset(preset: DatePreset): { from_date: string; to_date: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);

  if (preset === "1m") {
    fromDate.setDate(fromDate.getDate() - 30);
  } else if (preset === "3m") {
    fromDate.setMonth(fromDate.getMonth() - 3);
  } else if (preset === "6m") {
    fromDate.setMonth(fromDate.getMonth() - 6);
  } else {
    fromDate.setFullYear(fromDate.getFullYear() - 1);
  }

  return {
    from_date: fromDate.toISOString().slice(0, 10),
    to_date: toDate.toISOString().slice(0, 10),
  };
}

function Certificate() {
  const [datePreset, setDatePreset] = useState<DatePreset>("3m");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [workerName, setWorkerName] = useState<string>("Worker");
  const [certificates, setCertificates] = useState<CertificateListItem[]>([]);
  const [selectedCertRef, setSelectedCertRef] = useState<string | null>(null);
  const [summary, setSummary] = useState<CertificateSummary | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const toUiError = (err: any, fallback: string) => {
    const raw = err?.message || err?.error || fallback;
    const normalized = String(raw || "").toLowerCase();

    if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
      return "Could not reach certificate service. Please try again in a moment.";
    }
    if (err?.status === 401 || normalized.includes("unauthorized")) {
      return "Your session expired. Please log in again.";
    }
    if (err?.status === 403 || normalized.includes("forbidden")) {
      return "You do not have access to this certificate.";
    }

    return raw;
  };

  const loadCertificateSummary = async (certRef: string) => {
    try {
      setIsLoadingSummary(true);
      setError(null);
      const response = await api.certificate.getSummary(certRef);
      setSummary(response || null);
    } catch (err: any) {
      setError(toUiError(err, "Failed to load certificate summary"));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadCertificates = async (preferredCertRef?: string) => {
    try {
      setIsLoadingList(true);
      setError(null);
      setInfoMessage(null);

      const listResponse = await api.certificate.list();

      // Profile is optional for this page; certificate data should still load
      // even if auth profile endpoint has a temporary connectivity issue.
      try {
        const profileResponse = await api.getProfile();
        const name = profileResponse?.full_name || profileResponse?.user?.full_name;
        if (name) {
          setWorkerName(name);
        }
      } catch (profileErr) {
        console.warn("Could not load profile name for certificate page", profileErr);
      }

      const list: CertificateListItem[] = listResponse?.certificates || [];
      setCertificates(list);

      if (list.length === 0) {
        setSelectedCertRef(null);
        setSummary(null);
        return;
      }

      const selected = preferredCertRef || list[0].cert_ref;
      setSelectedCertRef(selected);
      await loadCertificateSummary(selected);
    } catch (err: any) {
      setError(toUiError(err, "Failed to load certificates"));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setInfoMessage(null);
      const range = getRangeFromPreset(datePreset);
      const response = await api.certificate.generate(range);
      const newRef = response?.cert_ref;

      if (newRef) {
        setSelectedCertRef(newRef);
      }

      if (response?.summary) {
        const generatedSummary: CertificateSummary = {
          cert_ref: newRef || "",
          worker_name: workerName,
          date_from: range.from_date,
          date_to: range.to_date,
          total_gross: response.summary.total_gross || 0,
          total_deductions: response.summary.total_deductions || 0,
          total_net: response.summary.total_net || 0,
          total_hours: response.summary.total_hours || 0,
          shift_count: response.summary.shift_count || 0,
          verified_count: response.summary.verified_count || 0,
          platform_breakdown: response.summary.platform_breakdown || {},
          created_at: response.createdAt,
        };

        setSummary(generatedSummary);

        if ((generatedSummary.shift_count || 0) === 0) {
          setInfoMessage("No earning records found in the selected date range. Try a wider range or add past shifts.");
        }
      }

      await loadCertificates(newRef);
    } catch (err: any) {
      setError(toUiError(err, "Failed to generate certificate"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenCertificate = (download = false, type?: 'summary' | 'detailed') => {
    if (!selectedCertRef) return;
    window.open(api.certificate.getViewUrl(selectedCertRef, download, type), "_blank", "noopener,noreferrer");
  };

  const byPlatform = useMemo(() => {
    if (!summary?.platform_breakdown) return [];

    return Object.entries(summary.platform_breakdown)
      .map(([platform, amount]) => ({
        platform,
        amount: Number(amount) || 0,
      }))
      .filter((row) => row.amount > 0)
      .filter((row) => platformFilter === "all" || row.platform === platformFilter);
  }, [summary, platformFilter]);

  const total = useMemo(
    () => byPlatform.reduce((acc, row) => acc + row.amount, 0),
    [byPlatform]
  );

  const platformOptions = useMemo(() => {
    if (!summary?.platform_breakdown) return [];
    return Object.keys(summary.platform_breakdown).filter((platform) => {
      const amount = Number(summary.platform_breakdown?.[platform]) || 0;
      return amount > 0;
    });
  }, [summary]);

  return (
    <PageContainer>
      <PageHeader
        title="Income certificate"
        description="Generate a verified, printable income proof for banks, landlords or visa offices."
        actions={
          <>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => handleOpenCertificate(true, 'summary')}
              disabled={!selectedCertRef || isLoadingSummary}
            >
              <Download className="h-4 w-4" /> Download Certificate
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => handleOpenCertificate(true, 'detailed')}
              disabled={!selectedCertRef || isLoadingSummary}
            >
              <Download className="h-4 w-4" /> Detailed Report
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-elegant">
            <h3 className="font-semibold text-sm">Date range</h3>
            <div className="mt-3 grid gap-3">
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
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
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {platformOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-1.5">
                {isGenerating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  "Generate certificate"
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-elegant">
            <h3 className="font-semibold text-sm">Previous certificates</h3>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {isLoadingList ? (
                <div className="text-sm text-muted-foreground">Loading certificates...</div>
              ) : certificates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No certificates yet. Generate one to begin.</div>
              ) : (
                certificates.map((cert) => (
                  <button
                    key={cert.id}
                    className={`w-full rounded-md border p-2 text-left text-xs transition-colors ${
                      selectedCertRef === cert.cert_ref ? "border-primary bg-primary-soft/30" : "hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      setSelectedCertRef(cert.cert_ref);
                      loadCertificateSummary(cert.cert_ref);
                    }}
                  >
                    <div className="font-mono text-[11px]">{cert.cert_ref}</div>
                    <div className="text-muted-foreground">
                      {new Date(cert.date_from).toLocaleDateString("en-PK")} - {new Date(cert.date_to).toLocaleDateString("en-PK")}
                    </div>
                  </button>
                ))
              )}
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
          {error && (
            <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="m-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {infoMessage}
            </div>
          )}
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
                <div className="font-mono">{summary?.cert_ref || "Not generated yet"}</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {isLoadingSummary ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" /> Loading certificate details...
              </div>
            ) : !summary ? (
              <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                No certificate selected. Generate your first certificate from the left panel.
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Issued to
                </div>
                <div className="mt-1 font-semibold text-base">{summary.worker_name || workerName}</div>
                <div className="text-muted-foreground">Gig Worker</div>
                <div className="text-muted-foreground">Pakistan</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Period</div>
                <div className="mt-1 font-semibold">
                  {new Date(summary.date_from).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                  {" - "}
                  {new Date(summary.date_to).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="text-muted-foreground">
                  Issued: {new Date(summary.created_at || Date.now()).toLocaleDateString("en-PK")}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Total verified earnings
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {formatPKR(platformFilter === "all" ? Number(summary.total_net) : total)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Across {summary.verified_count} verified shifts on {byPlatform.length} platform(s)
              </div>
            </div>

            {summary.shift_count === 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                No records found for this range. Your current account mostly has today's shifts only.
                Select a larger range or add older shifts in the Earnings page.
              </div>
            )}

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
                          {total > 0 ? Math.round((row.amount / total) * 100) : 0}%
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
                {summary.cert_ref ? `localhost:4006/api/certificates/${summary.cert_ref}` : "Generate certificate"}
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
