/**
 * Accessible, brand-consistent status blocks for the portal:
 * loading, empty, error (with retry), forbidden, and success.
 *
 * All of them are keyboard/screen-reader friendly:
 *  - loading uses role="status" + aria-live="polite"
 *  - error/forbidden use role="alert"
 * They render honest copy and never fabricate data.
 */

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ApiError, isApiError } from "@/lib/api";

function StateShell({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  role,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode | undefined;
  action?: ReactNode | undefined;
  tone?: "neutral" | "danger" | "warning" | "success" | undefined;
  role?: "status" | "alert" | undefined;
  className?: string | undefined;
}) {
  const toneRing =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-accent"
        : tone === "success"
          ? "text-primary"
          : "text-muted-foreground";
  return (
    <div
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className={cn("mb-4", toneRing)}>{icon}</div>
      <p className="text-base font-semibold text-primary">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

/** Full-block loading indicator. */
export function StateLoading({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <StateShell
      role="status"
      icon={<Loader2 className="size-8 animate-spin" aria-hidden="true" />}
      title={label}
      className={className}
    />
  );
}

/** Empty result set. */
export function StateEmpty({
  title = "Nothing here yet",
  description,
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      icon={<Inbox className="size-8" aria-hidden="true" />}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(action !== undefined ? { action } : {})}
      className={className}
    />
  );
}

/**
 * Error state. Understands {@link ApiError} to show honest, specific copy —
 * including a distinct message when the API is simply unreachable.
 */
export function StateError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const apiError: ApiError | null = isApiError(error) ? error : null;
  const isConnection = apiError?.isConnectionError ?? false;

  const title = isConnection ? "Can't reach the server" : "Something went wrong";
  const description =
    apiError?.message ?? (error instanceof Error ? error.message : "An unexpected error occurred.");

  return (
    <StateShell
      role="alert"
      tone="danger"
      icon={<AlertTriangle className="size-8" aria-hidden="true" />}
      title={title}
      description={
        <>
          {description}
          {apiError?.requestId && (
            <span className="mt-1 block text-xs text-muted-foreground/70">
              Reference: {apiError.requestId}
            </span>
          )}
        </>
      }
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

/** Insufficient permissions. */
export function StateForbidden({
  title = "You don't have access",
  description = "You don't have permission to view this area. If you think this is a mistake, contact your administrator.",
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      role="alert"
      tone="warning"
      icon={<ShieldOff className="size-8" aria-hidden="true" />}
      title={title}
      description={description}
      {...(action !== undefined ? { action } : {})}
      className={className}
    />
  );
}

/** Success confirmation block. */
export function StateSuccess({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      role="status"
      tone="success"
      icon={<CheckCircle2 className="size-8" aria-hidden="true" />}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(action !== undefined ? { action } : {})}
      className={className}
    />
  );
}
