/**
 * Shared buyer/vendor self-registration form.
 *
 * Both registrations create a `PENDING_APPROVAL` account (roadmap §5). The only
 * structural difference is that vendors declare their supply categories, so this
 * component is parameterized by `variant` rather than duplicated per portal.
 *
 * Password policy mirrors the backend (roadmap §6): 12–128 characters.
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/portal/auth-card";
import { TextField } from "@/components/portal/text-field";
import { Button } from "@/components/ui/button";
import { authApi, isApiError, type FieldError } from "@/lib/api";
import { parseSupplyCategories } from "@/lib/registration";

const passwordField = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Use at most 128 characters");

const baseShape = {
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(64, "Username is too long"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(5, "Enter a valid phone number"),
  country: z.string().min(1, "Country is required"),
};

const buyerSchema = z
  .object({
    ...baseShape,
    password: passwordField,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const vendorSchema = z
  .object({
    ...baseShape,
    // The UI collects a comma-separated string; the backend requires a non-empty
    // list where each entry is 2–255 chars. Validate the parsed list here.
    supply_categories: z
      .string()
      .min(1, "Describe what you supply")
      .refine((v) => parseSupplyCategories(v).length >= 1, {
        message: "Enter at least one supply category",
      })
      .refine((v) => parseSupplyCategories(v).every((c) => c.length >= 2 && c.length <= 255), {
        message: "Each category must be 2–255 characters",
      }),
    password: passwordField,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type BuyerValues = z.infer<typeof buyerSchema>;
type VendorValues = z.infer<typeof vendorSchema>;
type FormValues = VendorValues; // superset (buyer ignores supply_categories)

/** Map backend field errors onto our form field names where possible. */
function backendFieldName(field: string): keyof FormValues | null {
  const known: (keyof FormValues)[] = [
    "company_name",
    "contact_name",
    "username",
    "email",
    "phone",
    "country",
    "supply_categories",
    "password",
  ];
  // Backend list-item errors look like `supply_categories.0`; match the head
  // segment first, then fall back to the leaf for flat fields.
  const head = field.split(".")[0] ?? field;
  if ((known as string[]).includes(head)) return head as keyof FormValues;
  const leaf = field.split(".").pop() ?? field;
  return (known as string[]).includes(leaf) ? (leaf as keyof FormValues) : null;
}

export function RegistrationForm({ variant }: { variant: "buyer" | "vendor" }) {
  const navigate = useNavigate();
  const isVendor = variant === "vendor";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // The two schemas share every field except `supply_categories`; cast the
    // resolver to the superset form type so both variants share this hook.
    resolver: zodResolver(isVendor ? vendorSchema : buyerSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      company_name: "",
      contact_name: "",
      username: "",
      email: "",
      phone: "",
      country: "",
      supply_categories: "",
      password: "",
      confirm_password: "",
    },
  });

  const applyFieldErrors = (fieldErrors: FieldError[]) => {
    for (const fe of fieldErrors) {
      const name = backendFieldName(fe.field);
      if (name) setError(name, { message: fe.message });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // Destructure once: the conditional resolver widens `values`, so reading via
    // a destructuring pattern keeps field access clean and type-safe.
    const {
      company_name,
      contact_name,
      username,
      email,
      phone,
      country,
      password,
      supply_categories,
    } = values;
    try {
      if (isVendor) {
        await authApi.registerVendor({
          company_name,
          contact_name,
          username,
          email,
          phone,
          country,
          supply_categories: parseSupplyCategories(supply_categories),
          password,
        });
      } else {
        await authApi.registerBuyer({
          company_name,
          contact_name,
          username,
          email,
          phone,
          country,
          password,
        });
      }
      navigate({ to: "/account/pending", replace: true });
    } catch (err) {
      if (isApiError(err)) {
        if (err.fieldErrors.length > 0) applyFieldErrors(err.fieldErrors);
        setFormError(err.message);
      } else {
        setFormError("Registration failed. Please try again.");
      }
    }
  });

  return (
    <AuthCard
      width="lg"
      eyebrow={isVendor ? "Vendor registration" : "Buyer registration"}
      title={isVendor ? "Register as a vendor" : "Create a business account"}
      subtitle={
        isVendor
          ? "Tell us about your supply capabilities. An administrator reviews every vendor before activation."
          : "Register your company to submit enquiries and receive quotations. Accounts are activated after administrator review."
      }
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {formError && (
          <div
            role="alert"
            className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <fieldset className="space-y-5">
          <legend className="mb-2 font-serif text-lg text-primary">Company details</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Company name"
              required
              autoComplete="organization"
              error={errors.company_name?.message}
              {...register("company_name")}
            />
            <TextField
              label="Contact person"
              required
              autoComplete="name"
              error={errors.contact_name?.message}
              {...register("contact_name")}
            />
            <TextField
              label="Country"
              required
              autoComplete="country-name"
              error={errors.country?.message}
              {...register("country")}
            />
            <TextField
              label="Phone"
              type="tel"
              required
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
          {isVendor && (
            <TextField
              label="Supply categories"
              required
              hint="Comma-separated, e.g. Basmati rice, pulses, spices"
              error={errors.supply_categories?.message}
              {...register("supply_categories")}
            />
          )}
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="mb-2 font-serif text-lg text-primary">Account credentials</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Username"
              required
              autoComplete="username"
              error={errors.username?.message}
              {...register("username")}
            />
            <TextField
              label="Email"
              type="email"
              required
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              hint="12–128 characters"
              error={errors.password?.message}
              {...register("password")}
            />
            <TextField
              label="Confirm password"
              type="password"
              required
              autoComplete="new-password"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />
          </div>
        </fieldset>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isVendor ? "Submit vendor registration" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By registering you agree to our terms of trade. Your account will remain pending until an
          administrator approves it.
        </p>
      </form>
    </AuthCard>
  );
}
