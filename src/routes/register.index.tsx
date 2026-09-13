import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Truck } from "lucide-react";
import { AuthCard } from "@/components/portal/auth-card";

export const Route = createFileRoute("/register/")({
  head: () => ({ meta: [{ title: "Register — Leo Infinity Trade Portal" }] }),
  component: RegisterChooser,
});

function RegisterChooser() {
  return (
    <AuthCard
      eyebrow="Join the portal"
      title="Create your account"
      subtitle="Choose the account type that matches your business."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/register/buyer"
          className="group flex flex-col items-center gap-3 rounded-sm border border-border bg-secondary/50 p-6 text-center transition-colors hover:border-accent hover:bg-secondary"
        >
          <Building2
            className="size-8 text-primary transition-colors group-hover:text-accent"
            aria-hidden="true"
          />
          <span className="text-base font-semibold text-primary">Business Client</span>
          <span className="text-sm text-muted-foreground">
            Source products, submit enquiries and receive quotations.
          </span>
        </Link>
        <Link
          to="/register/vendor"
          className="group flex flex-col items-center gap-3 rounded-sm border border-border bg-secondary/50 p-6 text-center transition-colors hover:border-accent hover:bg-secondary"
        >
          <Truck
            className="size-8 text-primary transition-colors group-hover:text-accent"
            aria-hidden="true"
          />
          <span className="text-base font-semibold text-primary">Vendor</span>
          <span className="text-sm text-muted-foreground">
            Offer supply capabilities and respond to sourcing requests.
          </span>
        </Link>
      </div>
    </AuthCard>
  );
}
