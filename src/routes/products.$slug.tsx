/* eslint-disable prettier/prettier */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Download, MessageCircle } from "lucide-react";
import { contact, getCategory, getProduct, productsByCategory } from "@/data/catalog";
import { SmartImage } from "@/components/smart-image";
import { ProductGallery } from "@/components/product-gallery";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product Not Found — Leo Infinity Global General Trading" }] };
    }
    return {
      meta: [
        { title: `${loaderData.name} — Leo Infinity Global General Trading` },
        { name: "description", content: loaderData.description },
        {
          property: "og:title",
          content: `${loaderData.name} — Leo Infinity Global General Trading`,
        },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const product = Route.useLoaderData();
  const category = getCategory(product.category);
  const related = productsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 3);

  const galleryImages = Array.from(new Set([product.image, ...(product.gallery ?? [])]));

  const highlights: [string, string][] = [
    ["Price (FOB)", product.price],
    ["Pack Weight", product.weight],
    ["Origin", product.origin],
  ];

  const specs: [string, string][] = [
    ["Variety", product.variety],
    ["Grade", product.grade],
    ["Moisture", product.moisture],
    ["Packaging", product.packaging],
    ["MOQ", product.moq],
    ["Supply", product.supply],
    ["Shipping", product.shipping],
    ["Private Label", product.privateLabel],
    ["Destination", product.destination],
  ];

  return (
    <div>
      {/* Detail */}
      <section className="bg-card px-6 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <ProductGallery key={product.slug} images={galleryImages} alt={product.name} />
          <div>
            {product.featured && (
              <span className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                BEST SELLER
              </span>
            )}
            <p className="mb-1 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              {category?.name}
            </p>
            <h1 className="mb-6 font-serif text-4xl text-primary md:text-5xl">{product.name}</h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <div className="mb-10 grid gap-3 sm:grid-cols-3">
              {highlights.map(([label, value]) => (
                <div key={label} className="surface-3d rounded-sm border border-border p-4">
                  <p className="mb-1 text-xs font-bold tracking-wider text-accent uppercase">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <dl className="mb-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <dt className="mb-1 text-xs font-bold tracking-wider text-primary/50 uppercase">
                    {label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-4">
              <a href={`/request-quote?products=${product.slug}`} className="btn-primary">
                Request Price
              </a>
              <a href="/leo-infinity-product-specifications.pdf" download className="btn-outline">
                <Download className="size-4" /> Specifications
              </a>
              <a
                href={`${contact.whatsappLink}?text=${encodeURIComponent(`Hello, I'm interested in ${product.name}. Please share pricing and availability.`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-accent"
              >
                <MessageCircle className="size-4" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation strip */}
      <section className="border-y border-border bg-secondary px-6 py-10">
        <p className="mb-4 text-center text-xs text-muted-foreground">Available documentation depends on product, origin and destination and is confirmed in the quotation.</p>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
          <span>Phytosanitary Certificate</span>
          <span className="text-accent">•</span>
          <span>Certificate of Origin</span>
          <span className="text-accent">•</span>
          <span>Health Certificate</span>
          <span className="text-accent">•</span>
          <span>Lab Test Reports</span>
          <span className="text-accent">•</span>
          <span>Quality Inspection</span>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <span className="eyebrow">More in {category?.name}</span>
              <h2 className="font-serif text-4xl text-primary">Related Products</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="group rounded-sm border border-border bg-card"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-t-sm">
                    <SmartImage
                      src={p.image}
                      alt={p.name}
                      width={800}
                      height={600}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h4 className="font-serif text-xl text-primary group-hover:text-accent">
                      {p.name}
                    </h4>
                    <p className="mt-2 text-sm text-muted-foreground">{p.origin}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
