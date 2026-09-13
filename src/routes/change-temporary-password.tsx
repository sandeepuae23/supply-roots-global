import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/portal/auth-card";
import { TextField } from "@/components/portal/text-field";
import { StateLoading } from "@/components/portal/data-states";
import { Button } from "@/components/ui/button";
import { useAuth, portalHomeForUserType } from "@/lib/auth/use-auth";
import { isApiError, type FieldError } from "@/lib/api";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your temporary password"),
    new_password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(128, "Use at most 128 characters"),
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((v) => v.new_password !== v.current_password, {
    message: "Choose a password different from the temporary one",
    path: ["new_password"],
  });

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/change-temporary-password")({
  head: () => ({ meta: [{ title: "Change your password — Leo Infinity Trade Portal" }] }),
  component: ChangeTemporaryPasswordPage,
});

function ChangeTemporaryPasswordPage() {
  const navigate = useNavigate();
  const { status, user, changePassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  // Set the moment a change succeeds, so the "signed out" guard below doesn't
  // race our own navigate-to-login (which carries the success notice).
  const changedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  // Guard: only reachable while signed in. Users who no longer need to change
  // their password are sent to their portal.
  useEffect(() => {
    if (changedRef.current) return;
    if (status === "unauthenticated") {
      navigate({ to: "/login", replace: true });
    } else if (status === "authenticated" && user && !user.must_change_password) {
      navigate({ to: portalHomeForUserType(user.user_type), replace: true });
    }
  }, [status, user, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const message = await changePassword(values.current_password, values.new_password);
      // Success invalidates every session: force a fresh sign-in and surface the
      // backend's confirmation on the login screen.
      changedRef.current = true;
      navigate({ to: "/login", search: { notice: message }, replace: true });
    } catch (err) {
      if (isApiError(err)) {
        // Bind the wrong-current-password case to its field where we can.
        if (err.code === "invalid_current_password") {
          setError("current_password", { message: err.message });
        }
        for (const fe of err.fieldErrors as FieldError[]) {
          if (fe.field.endsWith("current_password")) {
            setError("current_password", { message: fe.message });
          } else if (fe.field.endsWith("new_password")) {
            setError("new_password", { message: fe.message });
          }
        }
        setFormError(err.message);
      } else {
        setFormError("Could not change your password. Please try again.");
      }
    }
  });

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <StateLoading label="Loading…" className="border-0 bg-transparent text-cream" />
      </div>
    );
  }

  return (
    <AuthCard
      eyebrow="Security"
      title="Set a new password"
      subtitle="Your account is using a temporary password. Choose a new password to continue to the portal."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <TextField
          label="Temporary password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.current_password?.message}
          {...register("current_password")}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          hint="12–128 characters"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Change password and continue
        </Button>
      </form>
    </AuthCard>
  );
}
