import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagBadge } from "@/components/TagBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { COMPLAINTS } from "@/lib/mock-data";
import { ArrowBigUp, MessageSquare, Plus } from "lucide-react";

export const Route = createFileRoute("/app/worker/community")({
  head: () => ({ meta: [{ title: "Community — FairGig" }] }),
  component: Community,
});

const TAG_VARIANT: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  "rate-cut": "danger",
  ban: "warning",
  "payment-issue": "info",
  delay: "neutral",
  harassment: "danger",
};

function Community() {
  const [open, setOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        title="Community grievance board"
        description="Report unfair practices and rally support from fellow workers."
        actions={
          <Button onClick={() => setOpen((v) => !v)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Post complaint
          </Button>
        }
      />

      {open && (
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">New complaint</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Title (e.g. Per-order pay reduced)" />
            <Input placeholder="Platform" />
          </div>
          <Textarea className="mt-3" placeholder="Describe what happened..." rows={4} />
          <div className="mt-3 flex gap-2">
            <Button>Post</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {COMPLAINTS.map((c) => (
          <article
            key={c.id}
            className="rounded-xl border bg-card p-5 shadow-elegant flex gap-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex flex-col items-center pt-1">
              <button className="h-8 w-8 rounded-md border hover:bg-primary-soft hover:border-primary/40 hover:text-primary transition-colors grid place-items-center">
                <ArrowBigUp className="h-4 w-4" />
              </button>
              <span className="mt-1 text-sm font-semibold tabular-nums">{c.upvotes}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary-soft text-primary">
                    {c.author
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{c.author}</span>
                <span>·</span>
                <span>{c.platform}</span>
                <span>·</span>
                <span>{c.city}</span>
                <span>·</span>
                <span>{c.createdAt}</span>
              </div>
              <h3 className="mt-2 font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TagBadge variant={TAG_VARIANT[c.tag]}>{c.tag.replace("-", " ")}</TagBadge>
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
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {c.comments} comments
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
