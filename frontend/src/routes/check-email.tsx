import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/check-email")({
  head: () => ({
    meta: [
      { title: "Check Your Email — FairGig" },
      { name: "description", content: "Verify your email address to complete registration." },
    ],
  }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get("email") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email address not found. Please sign up again.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.resendVerificationEmail(email);
      setSuccess("Verification email sent! Check your inbox.");
    } catch (err: any) {
      setError(err?.error || err?.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center hover:opacity-80 transition">
          <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold">FairGig</span>
        </Link>

        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Mail className="h-16 w-16 text-primary animate-bounce" />
            </div>
            <h1 className="text-2xl font-semibold">Check your email</h1>
            <div className="space-y-2 text-muted-foreground">
              <p>We've sent a verification link to:</p>
              {email && <p className="font-medium text-foreground truncate">{email}</p>}
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Click the link in the email to verify your account and complete registration.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={loading || !email}
              className="w-full"
              variant="outline"
            >
              {loading ? "Sending..." : "Resend verification email"}
            </Button>

            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full"
            >
              Back to sign in
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive the email?</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Try resending the email above</li>
            </ul>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-2 justify-center text-sm text-primary hover:underline mt-4"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
