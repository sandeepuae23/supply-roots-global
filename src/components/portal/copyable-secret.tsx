/**
 * Displays a one-time secret (the temporary password from an admin reset) with
 * a copy-to-clipboard affordance. The value is shown ONCE — the surrounding UI
 * is responsible for not re-fetching or persisting it.
 */

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyableSecret({
  value,
  label = "Temporary password",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — select the text and copy manually.");
    }
  }, [value]);

  return (
    <div className="rounded-sm border border-accent/40 bg-accent/5 p-4">
      <span className="field-label">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <code
          className="flex-1 overflow-x-auto rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          data-testid="temporary-password"
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        This password is shown only once. Copy it now and share it securely with the user. They must
        change it the next time they sign in.
      </p>
    </div>
  );
}
