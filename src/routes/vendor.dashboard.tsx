import { createFileRoute } from "@tanstack/react-router";
import { WelcomePanel } from "@/components/portal/welcome-panel";

export const Route = createFileRoute("/vendor/dashboard")({
  head: () => ({ meta: [{ title: "Vendor dashboard — Leo Infinity Trade Portal" }] }),
  component: () => (
    <WelcomePanel
      portalLabel="Vendor"
      upcoming={[
        "Company, facilities & warehouses",
        "Product capabilities & MOQ",
        "Seasonal availability & pricing",
        "Sourcing opportunities & offers",
        "Production & fulfilment milestones",
        "Vendor invoices & payment status",
      ]}
    />
  ),
});
