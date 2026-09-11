/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { QuoteWizard } from "@/components/quote-wizard";
import { PageHero } from "@/components/ui-primitives";
import { products } from "@/data/catalog";

export const Route = createFileRoute("/request-quote")({
  validateSearch: (search: Record<string, unknown>): { products?: string[] } => {
    const requested = typeof search["products"] === "string" ? search["products"].split(",") : [];
    if (!requested.length) return {};
    return {
      products: requested.filter((slug) => products.some((product) => product.slug === slug)).slice(0, 12),
    };
  },
  head: () => ({
    meta: [
      { title: "Request a Quote — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Build a multi-product B2B food quotation with quantities, Incoterms, destination port, delivery date and reference files.",
      },
      { property: "og:title", content: "Request a Quote — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "Prepare a detailed, trackable trade enquiry for our international food supply desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestQuotePage,
});

function RequestQuotePage() {
  const search = Route.useSearch();
  return (
    <div className="quote-page">
      <PageHero
        eyebrow="B2B quotation"
        title="Build your quote request"
        subtitle="Select several products, set quantities and delivery terms, then receive a unique reference for clear follow-up. Your draft stays saved on this device while you work."
      />
      <section className="bg-[#f8f4ec] px-4 py-16 md:px-6 md:py-24">
        <QuoteWizard initialProducts={search.products ?? []} />
      </section>
    </div>
  );
}
