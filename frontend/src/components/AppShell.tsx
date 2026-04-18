import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearUser, getUser, ROLE_LABEL, type Role, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  FileText,
  MessagesSquare,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Inbox,
  LogOut,
  Menu,
  X,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<Role, NavItem[]> = {
  worker: [
    { to: "/app/worker", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/worker/earnings", label: "Earnings", icon: Wallet },
    { to: "/app/worker/analytics", label: "Analytics", icon: LineChart },
    { to: "/app/worker/certificate", label: "Certificate", icon: FileText },
    { to: "/app/worker/community", label: "Community", icon: MessagesSquare },
  ],
  verifier: [
    { to: "/app/verifier", label: "Verification Queue", icon: Inbox },
    { to: "/app/verifier/stats", label: "My Stats", icon: ShieldCheck },
  ],
  advocate: [
    { to: "/app/advocate", label: "System Analytics", icon: BarChart3 },
    { to: "/app/advocate/vulnerability", label: "Vulnerability Panel", icon: AlertTriangle },
    { to: "/app/advocate/complaints", label: "Complaints", icon: MessagesSquare },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUserState] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUserState(getUser());
    sync();
    window.addEventListener("fairgig:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fairgig:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (user === null && typeof window !== "undefined") {
      const u = getUser();
      if (!u) navigate({ to: "/login" });
    }
  }, [user, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const items = NAV[user.role];

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">FairGig</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {ROLE_LABEL[user.role]}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== `/app/${user.role}` && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              clearUser();
              navigate({ to: "/login" });
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 backdrop-blur px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">FairGig</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar min-h-screen sticky top-0">
          {SidebarContent}
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <aside
              className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border"
              onClick={(e) => e.stopPropagation()}
            >
              {SidebarContent}
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {user.verification_status === "PENDING_APPROVAL" && (
            <div className="border-b bg-amber-50/50">
              <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3">
                <Alert className="bg-amber-50 border-amber-200">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Your account is pending verification by the FairGig team. We'll review your information and send you a confirmation email soon.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="p-5 sm:p-8 max-w-7xl mx-auto">{children}</div>;
}
