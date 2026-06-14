import { cn } from "@/lib/utils";
import type { MarhalahStatus, AssessmentStatus } from "@/lib/types";

const marhalahStyles: Record<MarhalahStatus, string> = {
  open: "bg-emerald-light text-emerald-deep border-emerald-mid/30",
  locked: "bg-muted text-muted-foreground border-border",
  completed: "bg-gold-light text-emerald-deep border-gold/30",
};

const assessmentStyles: Record<AssessmentStatus, string> = {
  open: "bg-emerald-light text-emerald-deep",
  upcoming: "bg-gold-light text-gold",
  expired: "bg-muted text-muted-foreground",
  completed: "bg-emerald-light text-emerald-deep",
};

interface StatusBadgeProps {
  status: MarhalahStatus | AssessmentStatus;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const styles =
    status in marhalahStyles
      ? marhalahStyles[status as MarhalahStatus]
      : assessmentStyles[status as AssessmentStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        styles,
        className
      )}
    >
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
