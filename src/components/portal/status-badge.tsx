/**
 * Small, consistent badges for account status and user type, used across the
 * admin list and detail views.
 */

import { cn } from "@/lib/utils";
import type { AccountStatus, UserType } from "@/lib/api";

const STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING_APPROVAL: "Pending approval",
  ACTIVE: "Active",
  LOCKED: "Locked",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  DISABLED: "Disabled",
};

// Tone classes driven by design tokens so light/dark both read well.
const STATUS_CLASS: Record<AccountStatus, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  PENDING_APPROVAL: "bg-accent/10 text-accent border-accent/30",
  LOCKED: "bg-destructive/10 text-destructive border-destructive/20",
  SUSPENDED: "bg-accent/10 text-accent border-accent/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  DISABLED: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: AccountStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const USER_TYPE_LABEL: Record<UserType, string> = {
  ADMIN: "Admin",
  BUYER: "Buyer",
  VENDOR: "Vendor",
};

export function UserTypeBadge({ userType, className }: { userType: UserType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground whitespace-nowrap",
        className,
      )}
    >
      {USER_TYPE_LABEL[userType]}
    </span>
  );
}

export { STATUS_LABEL, USER_TYPE_LABEL };
