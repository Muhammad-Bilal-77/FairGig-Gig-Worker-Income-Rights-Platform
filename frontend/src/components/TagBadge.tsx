import { cn } from "@/lib/utils";

type Variant =
  | "verified"
  | "flagged"
  | "pending"
  | "low"
  | "medium"
  | "high"
  | "neutral"
  | "info"
  | "success"
  | "danger"
  | "warning";

const styles: Record<Variant, string> = {
  verified: "bg-success-soft text-success border border-success/20",
  flagged: "bg-warning-soft text-warning-foreground border border-warning/30",
  pending: "bg-muted text-muted-foreground border border-border",
  low: "bg-success-soft text-success border border-success/20",
  medium: "bg-warning-soft text-warning-foreground border border-warning/30",
  high: "bg-danger-soft text-destructive border border-destructive/20",
  neutral: "bg-muted text-muted-foreground border border-border",
  info: "bg-info-soft text-info border border-info/20",
  success: "bg-success-soft text-success border border-success/20",
  danger: "bg-danger-soft text-destructive border border-destructive/20",
  warning: "bg-warning-soft text-warning-foreground border border-warning/30",
};

export function TagBadge({
  variant = "neutral",
  children,
  dot,
  className,
}: {
  variant?: Variant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[variant],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
