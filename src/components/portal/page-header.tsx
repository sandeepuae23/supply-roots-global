/**
 * Consistent page header for portal content screens.
 */

import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    // Portal screens use the neutral UI face, not the marketing serif: this is a
    // data tool, and an account name set in Playfair reads like an article byline.
    <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        {/* Badges sit under the title they describe. Floated to the far right
            they read as unrelated chips rather than attributes of this record. */}
        {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
