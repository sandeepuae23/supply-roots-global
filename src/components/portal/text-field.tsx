/**
 * Accessible text/select field wrappers used by the auth + registration forms.
 * Reuses the site's `.field-*` brand classes and wires label/description/error
 * associations for screen readers. Designed to compose with react-hook-form's
 * `register()` via spread props.
 */

import { forwardRef, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function FieldFrame({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean | undefined;
  className?: string | undefined;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="field-label">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children(describedBy)}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, className, ...inputProps },
  ref,
) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} required={required}>
      {(describedBy) => (
        <input
          {...inputProps}
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("field-input", error && "border-destructive", className)}
        />
      )}
    </FieldFrame>
  );
});

export interface SelectFieldProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "id"
> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, required, className, children, ...selectProps },
  ref,
) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} required={required}>
      {(describedBy) => (
        <select
          {...selectProps}
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("field-select", error && "border-destructive", className)}
        >
          {children}
        </select>
      )}
    </FieldFrame>
  );
});
