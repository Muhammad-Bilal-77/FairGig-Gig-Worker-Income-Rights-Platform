import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, login, signup, type Role } from "@/lib/auth";
import { Sparkles, User, ShieldCheck, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);

  // Sign up state
  const [signUpRole, setSignUpRole] = useState<Role>("worker");
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpCity, setSignUpCity] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError(null);
    setSignInSuccess(null);

    try {
      await login(signInEmail, signInPassword);
      setSignInSuccess("Logged in successfully! Redirecting...");
      setTimeout(() => {
        // Get user data to determine role
        const userStr = localStorage.getItem("fairgig.user");
        if (userStr) {
          const user = JSON.parse(userStr);
          navigate({ to: ROLE_HOME[user.role as keyof typeof ROLE_HOME] || "/app/worker" });
        }
      }, 1000);
    } catch (err: any) {
      // Check if email is not verified
      if (err?.code === "EMAIL_NOT_VERIFIED") {
        setSignInError(err?.error || "Please verify your email first");
        // Redirect to check-email after a brief delay
        setTimeout(() => {
          navigate({ to: "/check-email", search: { email: signInEmail } });
        }, 2000);
      } else {
        setSignInError(err?.error || err?.message || "Login failed");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpLoading(true);
    setSignUpError(null);
    setSignUpSuccess(null);

    // Validate password
    if (signUpPassword.length < 8) {
      setSignUpError("Password must be at least 8 characters");
      setSignUpLoading(false);
      return;
    }

    if (!/[A-Za-z]/.test(signUpPassword) || !/\d/.test(signUpPassword)) {
      setSignUpError("Password must contain at least one letter and one number");
      setSignUpLoading(false);
      return;
    }

    try {
      await signup({
        email: signUpEmail,
        password: signUpPassword,
        full_name: signUpName,
        role: signUpRole,
        phone: signUpPhone || undefined,
        city: signUpCity || undefined,
      });

      setSignUpSuccess(
        "Account created! Redirecting to verify your email..."
      );
      
      // Redirect to check-email page after 1.5 seconds
      setTimeout(() => {
        navigate({ to: "/check-email", search: { email: signUpEmail } });
      }, 1500);
    } catch (err: any) {
      setSignUpError(err?.error || err?.message || "Signup failed");
    } finally {
      setSignUpLoading(false);
    }
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

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN IN TAB */}
            <TabsContent value="signin" className="space-y-6 mt-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to your FairGig account
                </p>
              </div>

              {signInError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{signInError}</AlertDescription>
                </Alert>
              )}

              {signInSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{signInSuccess}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    disabled={signInLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    disabled={signInLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={signInLoading}>
                  {signInLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* SIGN UP TAB */}
            <TabsContent value="signup" className="space-y-6 mt-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join FairGig to get started
                </p>
              </div>

              {signUpError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{signUpError}</AlertDescription>
                </Alert>
              )}

              {signUpSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{signUpSuccess}</AlertDescription>
                </Alert>
              )}

              {/* Role selector */}
              <div className="space-y-2">
                <Label>I am a:</Label>
                <div className="grid gap-2">
                  {ROLES.map((r) => {
                    const active = r.id === signUpRole;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSignUpRole(r.id)}
                        disabled={signUpLoading}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                          active
                            ? "border-primary bg-primary-soft/40 shadow-elegant"
                            : "hover:bg-muted/60",
                          signUpLoading && "opacity-50 cursor-not-allowed"
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
                            "ml-auto h-4 w-4 rounded-full border-2 mt-1 flex-shrink-0",
                            active ? "border-primary bg-primary" : "border-border",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Asim Raza"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    disabled={signUpLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    disabled={signUpLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 8 chars, 1 letter, 1 number"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    disabled={signUpLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters, must include a letter and a number
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-phone">Phone (optional)</Label>
                  <Input
                    id="signup-phone"
                    placeholder="03001234567"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    disabled={signUpLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pakistani format: 03XXXXXXXXX or +923XXXXXXXXX
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-city">City (optional)</Label>
                  <Input
                    id="signup-city"
                    placeholder="Karachi"
                    value={signUpCity}
                    onChange={(e) => setSignUpCity(e.target.value)}
                    disabled={signUpLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={signUpLoading}>
                  {signUpLoading ? "Creating account..." : "Create Account"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  You'll receive a verification email after signup
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
