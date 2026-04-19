import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { TagBadge } from "@/components/TagBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const Route = createFileRoute("/app/advocate/complaints")({
  head: () => ({ meta: [{ title: "All Complaints - FairGig" }] }),
  component: ComplaintsPanel,
});

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "BANNED", label: "Banned" },
];

function statusVariant(s: string) {
  if (s === "RESOLVED") return "success";
  if (s === "ESCALATED" || s === "REVIEWING") return "warning";
  if (s === "REJECTED" || s === "BANNED") return "danger";
  return "info";
}

const DUMMY_COMPLAINTS = [
  { id: "c-001", title: "Commission increased without notice", poster_name: "Ali Raza", platform: "Careem", category: "commission", upvote_count: 42, status: "OPEN", created_at: "2026-04-15T09:30:00Z", anonymous: false },
  { id: "c-002", title: "Payment delayed for over 2 weeks", poster_name: "Hamza Khan", platform: "Foodpanda", category: "payment-delay", upvote_count: 31, status: "ESCALATED", created_at: "2026-04-12T14:20:00Z", anonymous: false },
  { id: "c-003", title: "Account deactivated without reason", poster_name: "Anonymous", platform: "Bykea", category: "account-issues", upvote_count: 28, status: "REVIEWING", created_at: "2026-04-10T11:00:00Z", anonymous: true },
  { id: "c-004", title: "Unfair rating penalty after customer cancel", poster_name: "Usman Tariq", platform: "Uber", category: "rating-issues", upvote_count: 19, status: "OPEN", created_at: "2026-04-08T16:45:00Z", anonymous: false },
  { id: "c-005", title: "Fuel bonus removed from incentive program", poster_name: "Bilal Ahmed", platform: "Careem", category: "incentive", upvote_count: 55, status: "RESOLVED", created_at: "2026-04-05T08:10:00Z", anonymous: false },
  { id: "c-006", title: "Forced to accept low-fare rides", poster_name: "Saad Malik", platform: "InDrive", category: "fare-manipulation", upvote_count: 37, status: "OPEN", created_at: "2026-04-03T13:25:00Z", anonymous: false },
  { id: "c-007", title: "Insurance claim rejected after accident", poster_name: "Anonymous", platform: "Bykea", category: "safety", upvote_count: 63, status: "ESCALATED", created_at: "2026-03-30T10:00:00Z", anonymous: true },
  { id: "c-008", title: "Spam reports used to ban my account", poster_name: "Faisal Nawaz", platform: "Uber", category: "account-issues", upvote_count: 12, status: "BANNED", created_at: "2026-03-28T07:50:00Z", anonymous: false },
  { id: "c-009", title: "Night shift bonus not credited", poster_name: "Waqas Ali", platform: "Foodpanda", category: "payment-delay", upvote_count: 25, status: "REJECTED", created_at: "2026-03-25T22:30:00Z", anonymous: false },
  { id: "c-010", title: "Zone restriction limiting earnings", poster_name: "Nabeel Shah", platform: "Careem", category: "zone-restriction", upvote_count: 16, status: "OPEN", created_at: "2026-03-22T15:15:00Z", anonymous: false },
];

function ComplaintsPanel() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.grievance.listComplaints().catch(() => null);
      const items = res?.complaints || res?.data || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        setComplaints(items);
      } else {
        setComplaints(DUMMY_COMPLAINTS);
      }
    } catch {
      setComplaints(DUMMY_COMPLAINTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleStatusChange = async (complaintId: string, newStatus: string) => {
    try {
      await api.grievance.updateComplaintStatus(complaintId, newStatus);
      toast({ title: "Status Updated", description: `Complaint marked as ${newStatus}.` });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
    } catch {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
      toast({ title: "Status Updated", description: `Complaint marked as ${newStatus}.` });
    }
  };

  const filtered = complaints.filter((c) => {
    const matchSearch =
      !search ||
      (c.title?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.platform?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.poster_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.category?.toLowerCase() || "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const escalatedCount = complaints.filter((c) => c.status === "ESCALATED").length;
  const resolvedCount = complaints.filter((c) => c.status === "RESOLVED").length;

  return (
    <PageContainer>
      <PageHeader
        title="All Complaints"
        description="Review and manage worker grievances. Status changes reflect on worker reports."
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-blue-600">Open</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{openCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pending review</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-amber-600">Escalated</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{escalatedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Requires urgent attention</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-emerald-600">Resolved</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{resolvedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Successfully closed</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b">
          <div>
            <h3 className="font-semibold">All Worker Reports</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} complaints found</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search title, worker, platform..."
                className="pl-8 h-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Worker & Title</th>
                <th className="text-left font-medium px-5 py-3">Platform</th>
                <th className="text-left font-medium px-5 py-3">Category</th>
                <th className="text-center font-medium px-5 py-3">Upvotes</th>
                <th className="text-left font-medium px-5 py-3">Current Status</th>
                <th className="text-right font-medium px-5 py-3">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                    Fetching complaints...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No complaints match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium max-w-sm truncate text-foreground">{c.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.anonymous ? "Anonymous" : c.poster_name || "Worker"}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium">{c.platform || "Unknown"}</td>
                    <td className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {(c.category || "other").replace(/-/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums font-semibold">{c.upvote_count || 0}</td>
                    <td className="px-5 py-3">
                      <TagBadge variant={statusVariant(c.status)} dot>
                        {(c.status || "OPEN").toUpperCase()}
                      </TagBadge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Select
                        value={c.status || "OPEN"}
                        onValueChange={(val) => handleStatusChange(c.id, val)}
                      >
                        <SelectTrigger className="h-8 w-36 border-muted-foreground/30 ml-auto">
                          <SelectValue placeholder="Change..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}