/**
 * Summary metric card for portal dashboards.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "neutral" | "primary" | "accent" | "danger";
  className?: string;
}) {
  const accentBar =
    tone === "primary"
      ? "bg-primary"
      : tone === "accent"
        ? "bg-accent"
        : tone === "danger"
          ? "bg-destructive"
          : "bg-border";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", accentBar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-primary">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && <Icon className="size-5 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
      </div>
    </div>
  );
}
