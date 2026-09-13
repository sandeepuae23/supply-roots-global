import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/portal/auth-card";
import { TextField } from "@/components/portal/text-field";
import { Button } from "@/components/ui/button";
import { useAuth, portalHomeForUserType } from "@/lib/auth/use-auth";
import { routeForStatus, routeForLoginErrorCode } from "@/lib/auth/account-status";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { isApiError } from "@/lib/api";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; notice?: string } => {
    const redirect = search["redirect"];
    const notice = search["notice"];
    const out: { redirect?: string; notice?: string } = {};
    if (typeof redirect === "string" && redirect) out.redirect = redirect;
    if (typeof notice === "string" && notice) out.notice = notice;
    return out;
  },
  head: () => ({
    meta: [{ title: "Sign in — Leo Infinity Trade Portal" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, notice } = Route.useSearch();
  const { login, status, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  // If already signed in, send the user to their portal (or the redirect target).
  // The redirect param is untrusted, so it is validated to a safe internal path.
  useEffect(() => {
    if (status === "authenticated" && user) {
      if (user.must_change_password) {
        navigate({ to: "/change-temporary-password", replace: true });
      } else {
        const home = portalHomeForUserType(user.user_type);
        navigate({ to: safeRedirect(redirect, home), replace: true });
      }
    }
  }, [status, user, redirect, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const signedIn = await login(values.identifier, values.password);
      if (signedIn.must_change_password) {
        navigate({ to: "/change-temporary-password", replace: true });
        return;
      }
      // Defensive: a successful login should only ever return an ACTIVE user,
      // but if a non-active status ever slips through, route to its screen.
      const blocked = routeForStatus(signedIn.status);
      if (blocked) {
        navigate({ to: blocked, replace: true });
        return;
      }
      const home = portalHomeForUserType(signedIn.user_type);
      navigate({ to: safeRedirect(redirect, home), replace: true });
    } catch (err) {
      // The backend denies tokens for non-active accounts (403) with a specific
      // code; route those to the matching help screen so it stays reachable.
      if (isApiError(err)) {
        const statusRoute = routeForLoginErrorCode(err.code);
        if (statusRoute) {
          navigate({ to: statusRoute, replace: true });
          return;
        }
        setFormError(err.message);
      } else {
        setFormError("Sign in failed. Please try again.");
      }
    }
  });

  return (
    <AuthCard
      eyebrow="Trade Portal"
      title="Sign in"
      subtitle="Access your buyer, vendor or administrator workspace."
      footer={
        <div className="space-y-2">
          <p>
            New buyer?{" "}
            <Link to="/register/buyer" className="font-semibold text-accent hover:underline">
              Create a business account
            </Link>
          </p>
          <p>
            Supplier?{" "}
            <Link to="/register/vendor" className="font-semibold text-accent hover:underline">
              Register as a vendor
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {notice && !formError && (
          <div
            role="status"
            className="rounded-sm border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            {notice}
          </div>
        )}
        {formError && (
          <div
            role="alert"
            className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <TextField
          label="Username or email"
          type="text"
          autoComplete="username"
          autoFocus
          required
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
