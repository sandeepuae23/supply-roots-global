/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalogExplorer } from "@/components/product-discovery";
import { categories } from "@/data/catalog";
import type { ProductGroup } from "@/lib/product-utils";

type ProductSearch = {
  q?: string | undefined;
  category?: string | undefined;
  group?: ProductGroup | undefined;
};

const productGroups: ProductGroup[] = ["all", "featured", "seasonal", "high-demand"];

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search["q"] === "string" ? search["q"].slice(0, 80) : undefined,
    category:
      typeof search["category"] === "string" && categories.some((item) => item.slug === search["category"])
        ? search["category"]
        : undefined,
    group:
      typeof search["group"] === "string" && productGroups.includes(search["group"] as ProductGroup)
        ? (search["group"] as ProductGroup)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Product Catalog — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Search and compare food products by category, origin, packaging, availability and minimum order quantity.",
      },
      { property: "og:title", content: "Product Catalog — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "Explore detailed food product specifications for international supply enquiries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  return (
    <div className="catalog-page">
      <ProductCatalogExplorer
        initialQuery={search.q ?? ""}
        initialCategory={search.category ?? "all"}
        initialGroup={search.group ?? "all"}
      />
    </div>
  );
}
