import { createFileRoute } from "@tanstack/react-router";
import { WelcomePanel } from "@/components/portal/welcome-panel";

export const Route = createFileRoute("/buyer/dashboard")({
  head: () => ({ meta: [{ title: "Buyer dashboard — Leo Infinity Trade Portal" }] }),
  component: () => (
    <WelcomePanel
      portalLabel="Business Client"
      upcoming={[
        "Company & delivery profiles",
        "Product catalog and favorites",
        "Multi-product enquiries",
        "Quotation review & decisions",
        "Order tracking & shipments",
        "Invoices & payment evidence",
      ]}
    />
  ),
});
