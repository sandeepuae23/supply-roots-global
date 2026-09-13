/**
 * Confirmation dialog for administrator account actions.
 *
 * Every admin mutation requires a reason (roadmap §9), so this dialog will not
 * submit until a non-empty reason is provided. Optional `presets` render a
 * controlled reason picker (e.g. `REGISTRATION_VERIFIED` for approvals) plus a
 * free-text notes field; without presets it shows a free-text reason field.
 */

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiError } from "@/lib/api";

export interface ReasonPreset {
  value: string;
  label: string;
}

export interface ReasonSubmission {
  reason: string;
  notes?: string;
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  presets,
  submitting = false,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  presets?: ReasonPreset[];
  submitting?: boolean;
  /** Server error from the last attempt, shown inline. */
  error?: unknown;
  onSubmit: (submission: ReasonSubmission) => void;
}) {
  const reasonFieldId = useId();
  const notesFieldId = useId();
  const hasPresets = !!presets && presets.length > 0;

  const [preset, setPreset] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setPreset(hasPresets ? presets![0]!.value : "");
      setReason("");
      setNotes("");
      setTouched(false);
    }
  }, [open, hasPresets, presets]);

  const effectiveReason = hasPresets ? preset : reason.trim();
  const reasonValid = effectiveReason.length > 0;
  const errorMessage = isApiError(error) ? error.message : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!reasonValid || submitting) return;
    const submission: ReasonSubmission = hasPresets
      ? { reason: preset, ...(notes.trim() ? { notes: notes.trim() } : {}) }
      : { reason: effectiveReason };
    onSubmit(submission);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {hasPresets ? (
              <div className="space-y-2">
                <Label htmlFor={reasonFieldId}>Reason</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger id={reasonFieldId}>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets!.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 pt-2">
                  <Label htmlFor={notesFieldId}>Notes (optional)</Label>
                  <Textarea
                    id={notesFieldId}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional review notes"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={reasonFieldId}>
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={reasonFieldId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  rows={3}
                  required
                  aria-invalid={touched && !reasonValid}
                  aria-describedby={touched && !reasonValid ? `${reasonFieldId}-error` : undefined}
                  placeholder="Explain why you are taking this action (recorded in the audit log)"
                />
                {touched && !reasonValid && (
                  <p
                    id={`${reasonFieldId}-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    A reason is required for this action.
                  </p>
                )}
              </div>
            )}

            {errorMessage && (
              <p
                className="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={submitting || !reasonValid}
            >
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
