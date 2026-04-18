import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  LineChart,
  FileText,
  MessagesSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FairGig — Income & Rights Platform for Gig Workers" },
      {
        name: "description",
        content:
          "Track earnings across platforms, verify income, generate certificates, and protect your rights. Built for gig workers in Pakistan.",
      },
      { property: "og:title", content: "FairGig — Income & Rights Platform" },
      {
        property: "og:description",
        content: "Track, verify and protect your gig income across Foodpanda, Careem, InDrive and more.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto h-14 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">FairGig</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Built for 1.2M+ gig workers in Pakistan
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight max-w-4xl mx-auto">
            Earn fair. Get verified.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Know your rights.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            FairGig is the income & rights platform for gig workers — track earnings across every
            platform, prove your income, and detect unfair practices at scale.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Explore as Verifier
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["Foodpanda", "Careem", "InDrive", "Bykea", "Yango", "Cheetay"].map((p) => (
              <span key={p} className="font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: LineChart,
              title: "Track earnings",
              body: "Log shifts across every platform. Auto-calculate net pay and commissions.",
            },
            {
              icon: ShieldCheck,
              title: "Verified income",
              body: "Upload screenshots and get income verified by independent reviewers.",
            },
            {
              icon: FileText,
              title: "Income certificates",
              body: "Generate bank-ready income proof in seconds. Perfect for loans and visas.",
            },
            {
              icon: MessagesSquare,
              title: "Collective voice",
              body: "Report unfair practices. Advocates analyze patterns and escalate.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-elegant">
              <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary grid place-items-center">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="mt-4 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border bg-card p-8 sm:p-12 shadow-elegant">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                One platform. Three roles. Real impact.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Whether you ride, verify, or advocate — FairGig gives you the tools to make gig work
                fair and transparent.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Anomaly detection alerts when income drops 20%+",
                  "Pattern analysis across cities and platforms",
                  "Grievance board with clustering and escalation",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { role: "Worker", desc: "Track & prove income" },
                { role: "Verifier", desc: "Review and approve" },
                { role: "Advocate", desc: "Detect unfairness" },
              ].map((r) => (
                <div
                  key={r.role}
                  className="rounded-xl border bg-background p-4 hover:shadow-glow transition-shadow"
                >
                  <div className="text-sm font-semibold">{r.role}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© 2025 FairGig. Building dignity for gig work.</span>
          <span>Karachi · Lahore · Islamabad</span>
        </div>
      </footer>
    </div>
  );
}
