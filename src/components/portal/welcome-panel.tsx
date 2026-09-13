/**
 * Placeholder dashboard body for portals whose business screens land in later
 * phases (Buyer, Vendor). Confirms the authenticated session and sets honest
 * expectations without faking data.
 */

import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { PageHeader } from "@/components/portal/page-header";

export function WelcomePanel({
  portalLabel,
  upcoming,
}: {
  portalLabel: string;
  upcoming: string[];
}) {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`Welcome${user ? `, ${user.username}` : ""}`}
        description={`Your ${portalLabel.toLowerCase()} workspace`}
      />
      <div className="rounded-sm border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-accent">
          <Sparkles className="size-5" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wider uppercase">Coming soon</span>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your account is active. The following workspaces will become available as the portal rolls
          out in upcoming phases:
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {upcoming.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-0.5 font-bold text-accent" aria-hidden="true">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
