import { createFileRoute, useLocation, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { verifyEmail } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Email — FairGig" },
      { name: "description", content: "Verify your email address to complete registration." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided. Please check your email for the correct link.");
      return;
    }

    const verifyAsync = async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
        setMessage("Email verified successfully! You can now sign in to your account.");
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.error || err?.message || "Email verification failed. The token may have expired or is invalid.");
      }
    };

    verifyAsync();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold">FairGig</span>
        </Link>

        <div className="space-y-6">
          {status === "loading" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">Verifying your email...</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold">Email verified!</h1>
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Redirecting to sign in page...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold">Verification failed</h1>
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="space-y-2 pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Back to Sign In</Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  If you didn't receive the email, please sign up again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
