import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, setUser, type Role } from "@/lib/auth";
import { Sparkles, User, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — FairGig" },
      { name: "description", content: "Sign in to FairGig as a worker, verifier, or advocate." },
    ],
  }),
  component: LoginPage,
});

const ROLES: { id: Role; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "worker", title: "Gig Worker", desc: "Track earnings, get verified, generate certificates", icon: User },
  { id: "verifier", title: "Verifier", desc: "Review submissions and approve income proof", icon: ShieldCheck },
  { id: "advocate", title: "Advocate / Analyst", desc: "Detect unfair practices at scale", icon: BarChart3 },
];

const DEFAULT_NAMES: Record<Role, string> = {
  worker: "Asim Raza",
  verifier: "Hira Sohail",
  advocate: "Dr. Mehreen Qadir",
};

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("worker");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      name: name || DEFAULT_NAMES[role],
      email: email || `${role}@fairgig.pk`,
      role,
      city: "Karachi",
    });
    navigate({ to: ROLE_HOME[role] });
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex relative bg-gradient-primary text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">FairGig</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight max-w-md">
            “FairGig helped me prove my income and get a motorbike loan in 3 days.”
          </h2>
          <p className="mt-4 text-sm text-primary-foreground/80">
            — Bilal, Foodpanda rider · Lahore
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 text-xs">
          {[
            { k: "12,400+", v: "Workers" },
            { k: "Rs 84M", v: "Verified" },
            { k: "98.2%", v: "Accuracy" },
          ].map((s) => (
            <div key={s.v} className="rounded-lg bg-white/10 backdrop-blur p-3">
              <div className="text-lg font-semibold">{s.k}</div>
              <div className="text-primary-foreground/70">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold">FairGig</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a role to enter the demo dashboard.
          </p>

          <div className="mt-6 grid gap-2">
            {ROLES.map((r) => {
              const active = r.id === role;
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary-soft/40 shadow-elegant"
                      : "hover:bg-muted/60",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md grid place-items-center shrink-0",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                  <span
                    className={cn(
                      "ml-auto h-4 w-4 rounded-full border-2 mt-1",
                      active ? "border-primary bg-primary" : "border-border",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder={DEFAULT_NAMES[role]}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@fairgig.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Continue as {ROLES.find((r) => r.id === role)?.title}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo mode · No password required
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
