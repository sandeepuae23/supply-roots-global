/**
 * Renders one account-status screen (pending / rejected / locked / suspended /
 * disabled) from its {@link AccountStatusMeta}. Used by the `/account/*` routes.
 */

import { Link } from "@tanstack/react-router";
import { Clock, Lock, PauseCircle, XCircle, Ban } from "lucide-react";
import type { AccountStatusMeta } from "@/lib/auth/account-status";
import { AuthCard } from "@/components/portal/auth-card";
import { contact } from "@/data/catalog";

const ICONS = {
  PENDING_APPROVAL: Clock,
  REJECTED: XCircle,
  LOCKED: Lock,
  SUSPENDED: PauseCircle,
  DISABLED: Ban,
} as const;

const TONE_CLASS = {
  info: "text-primary",
  warning: "text-accent",
  danger: "text-destructive",
} as const;

export function AccountStatusScreen({ meta }: { meta: AccountStatusMeta }) {
  const Icon = ICONS[meta.status as keyof typeof ICONS] ?? Clock;

  return (
    <AuthCard eyebrow={meta.eyebrow} title={meta.title}>
      <div role="status" aria-live="polite" className="flex flex-col items-center text-center">
        <div className={`mb-6 ${TONE_CLASS[meta.tone]}`}>
          <Icon className="size-12" aria-hidden="true" />
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{meta.description}</p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/login" className="btn-outline px-6! py-3! text-xs!">
            Back to sign in
          </Link>
          <a href={`mailto:${contact.email}`} className="btn-accent px-6! py-3! text-xs!">
            Contact trade desk
          </a>
        </div>
      </div>
    </AuthCard>
  );
}
