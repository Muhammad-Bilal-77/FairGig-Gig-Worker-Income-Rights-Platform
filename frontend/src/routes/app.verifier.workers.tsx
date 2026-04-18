import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { api, type WorkerAccount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TagBadge } from "@/components/TagBadge";
import { Loader2, RefreshCw, Search } from "lucide-react";

export const Route = createFileRoute("/app/verifier/workers")({
  head: () => ({ meta: [{ title: "Worker Management - FairGig" }] }),
  component: VerifierWorkersPage,
});

function VerifierWorkersPage() {
  const [workers, setWorkers] = useState<WorkerAccount[]>([]);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingWorkerId, setUpdatingWorkerId] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkers(true);
  }, [includeInactive]);

  const filteredWorkers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return workers;
    }

    return workers.filter((worker) => {
      return (
        worker.full_name?.toLowerCase().includes(term) ||
        worker.email?.toLowerCase().includes(term) ||
        worker.id?.toLowerCase().includes(term)
      );
    });
  }, [workers, search]);

  async function loadWorkers(initial = false) {
    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await api.listWorkers({
        include_inactive: includeInactive,
        limit: 200,
      });

      setWorkers(response.data || []);
    } catch (err: any) {
      console.error("Failed to load workers", err);
      setError(err?.message || err?.error || "Could not load workers.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleStatusChange(worker: WorkerAccount, nextActiveState: boolean) {
    try {
      setUpdatingWorkerId(worker.id);
      setError(null);

      const response = await api.setWorkerActiveStatus(worker.id, nextActiveState);

      setWorkers((current) =>
        current.map((item) =>
          item.id === worker.id ? response.data : item
        )
      );

      // If active-only mode and the worker was deactivated, hide instantly.
      if (!includeInactive && !nextActiveState) {
        setWorkers((current) => current.filter((item) => item.id !== worker.id));
      }
    } catch (err: any) {
      console.error("Failed to update worker status", err);
      setError(err?.message || err?.error || "Could not update worker status.");
    } finally {
      setUpdatingWorkerId(null);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Worker management"
        description="View worker accounts and toggle worker active/inactive status"
        actions={
          <Button
            variant="outline"
            onClick={() => void loadWorkers(false)}
            disabled={isLoading || isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
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
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers by name, email, or id"
              className="pl-9"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(Boolean(checked))}
            />
            Include inactive workers
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Loading workers...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-elegant p-10 text-center">
          <p className="text-base font-medium">No workers found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try changing your search or include inactive filter.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
          <div className="grid grid-cols-[2fr_2fr_1.2fr_1fr_1fr] gap-3 px-4 py-3 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>Email</span>
            <span>Location</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          <div className="max-h-160 overflow-y-auto divide-y">
            {filteredWorkers.map((worker) => {
              const isUpdating = updatingWorkerId === worker.id;
              return (
                <div
                  key={worker.id}
                  className="grid grid-cols-[2fr_2fr_1.2fr_1fr_1fr] gap-3 px-4 py-3 items-center"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{worker.full_name || "N/A"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{worker.id}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm truncate">{worker.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Last login: {worker.last_login_at ? new Date(worker.last_login_at).toLocaleString() : "Never"}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground truncate">
                    {worker.city || "N/A"}
                    {worker.city_zone ? `, ${worker.city_zone}` : ""}
                  </div>

                  <div>
                    <TagBadge variant={worker.is_active ? "success" : "danger"} dot>
                      {worker.is_active ? "active" : "inactive"}
                    </TagBadge>
                  </div>

                  <div className="text-right">
                    <Button
                      size="sm"
                      variant={worker.is_active ? "outline" : "default"}
                      disabled={isUpdating}
                      onClick={() => void handleStatusChange(worker, !worker.is_active)}
                      className="min-w-28"
                    >
                      {isUpdating ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving
                        </span>
                      ) : worker.is_active ? (
                        "Set inactive"
                      ) : (
                        "Set active"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
