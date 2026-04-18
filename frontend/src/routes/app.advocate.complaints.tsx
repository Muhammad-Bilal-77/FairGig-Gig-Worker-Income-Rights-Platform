import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { TagBadge } from "@/components/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPLAINTS } from "@/lib/mock-data";
import { Layers, Search } from "lucide-react";

export const Route = createFileRoute("/app/advocate/complaints")({
  head: () => ({ meta: [{ title: "Complaints — FairGig" }] }),
  component: Complaints,
});

const TAG_VARIANT: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  "rate-cut": "danger",
  ban: "warning",
  "payment-issue": "info",
  delay: "neutral",
  harassment: "danger",
};

function Complaints() {
  // simple cluster mock
  const clusters = [
    { name: "Foodpanda rate cut · Karachi East", count: 312, tag: "rate-cut" as const },
    { name: "Careem account bans · Lahore", count: 89, tag: "ban" as const },
    { name: "Bykea payment delays · Islamabad", count: 47, tag: "payment-issue" as const },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Complaint management"
        description="Cluster, triage, and escalate worker grievances."
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {clusters.map((c) => (
          <div key={c.name} className="rounded-xl border bg-card p-5 shadow-elegant">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Cluster
            </div>
            <h4 className="mt-1 font-semibold">{c.name}</h4>
            <div className="mt-3 flex items-center justify-between">
              <TagBadge variant={TAG_VARIANT[c.tag]}>{c.tag.replace("-", " ")}</TagBadge>
              <span className="text-2xl font-semibold tabular-nums">{c.count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b">
          <div>
            <h3 className="font-semibold">All complaints</h3>
            <p className="text-xs text-muted-foreground">{COMPLAINTS.length} entries</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search complaints" className="pl-8 h-9 w-56" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="under-review">Under review</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">ID</th>
                <th className="text-left font-medium px-5 py-3">Title</th>
                <th className="text-left font-medium px-5 py-3">Platform</th>
                <th className="text-left font-medium px-5 py-3">City</th>
                <th className="text-left font-medium px-5 py-3">Tag</th>
                <th className="text-right font-medium px-5 py-3">Upvotes</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-right font-medium px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {COMPLAINTS.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium max-w-md truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.author}</div>
                  </td>
                  <td className="px-5 py-3">{c.platform}</td>
                  <td className="px-5 py-3">{c.city}</td>
                  <td className="px-5 py-3">
                    <TagBadge variant={TAG_VARIANT[c.tag]}>{c.tag.replace("-", " ")}</TagBadge>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.upvotes}</td>
                  <td className="px-5 py-3">
                    <TagBadge
                      variant={
                        c.status === "resolved"
                          ? "success"
                          : c.status === "escalated"
                            ? "warning"
                            : "info"
                      }
                      dot
                    >
                      {c.status.replace("-", " ")}
                    </TagBadge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost">
                      Review
                    </Button>
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
