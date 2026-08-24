import { createFileRoute, Link } from "@tanstack/react-router";
import { categories, productsByCategory } from "@/data/catalog";
import { SectionHeading } from "@/components/ui-primitives";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Product Catalog — GlobalTerra Food Trading" },
      {
        name: "description",
        content:
          "Export-grade vegetables, fruits, basmati rice, pulses, eggs, spices, grains, dry fruits, nuts, edible oils and frozen foods for international markets.",
      },
      { property: "og:title", content: "Product Catalog — GlobalTerra Food Trading" },
      {
        property: "og:description",
        content: "12 food categories, 60+ products, bulk and private-label supply with full export documentation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Our Catalog"
          title="Product Categories"
          action={
            <Link to="/request-quote" className="btn-accent px-5! py-2.5! text-xs!">
              Request a Quote
            </Link>
          }
        />
        <p className="mb-16 max-w-2xl text-muted-foreground">
          Twelve specialized food categories, sourced from audited growers and processors. Every product is available
          in bulk packaging with private-label options and complete export documentation.
        </p>

        <div className="space-y-20">
          {categories.map((c) => {
            const catProducts = productsByCategory(c.slug);
            return (
              <section key={c.slug} id={c.slug} className="scroll-mt-32">
                <div className="mb-8 grid items-center gap-8 rounded-sm border border-border bg-card p-6 md:grid-cols-[240px_1fr] md:p-8">
                  <img
                    src={c.image}
                    alt={c.name}
                    width={600}
                    height={600}
                    loading="lazy"
                    className="aspect-square w-full rounded-sm object-cover"
                  />
                  <div>
                    <h2 className="font-serif text-3xl text-primary">{c.name}</h2>
                    <p className="mt-2 text-muted-foreground">{c.tagline}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {catProducts.map((p) => (
                        <Link
                          key={p.slug}
                          to="/products/$slug"
                          params={{ slug: p.slug }}
                          className="rounded-sm border border-primary/20 bg-secondary px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
