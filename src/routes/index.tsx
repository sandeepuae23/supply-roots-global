import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, Download, Globe2 } from "lucide-react";
import { HeroGlobe } from "@/components/hero-globe";
import {
  CompanyFilm,
  FinalQuoteCta,
  GlobalMarkets,
  HomeFaq,
  HowWeWork,
  PackagingShowcase,
  QualityGallery,
  SeasonalCalendar,
  WhyChooseCards,
} from "@/components/home-enhancements";
import { SectionHeading } from "@/components/ui-primitives";
import { SmartImage } from "@/components/smart-image";
import { categories, featuredProducts } from "@/data/catalog";
import "@/home-experience.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Food Import & Export — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Supplying quality vegetables, fruits, rice, pulses, eggs, spices, grains and food products across UAE, India, Saudi Arabia, Qatar, Oman, Europe, Africa and Asia.",
      },
      {
        property: "og:title",
        content: "Global Food Import & Export — Leo Infinity Global General Trading",
      },
      {
        property: "og:description",
        content:
          "Quality food products. Reliable global supply. Explore 12 product categories for international markets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const heroMarkets = ["UAE & Gulf", "India", "Europe", "Africa", "Asia"];

function HomePage() {
  return (
    <div>
      <section className="trade-hero" aria-labelledby="home-title">
        <div className="trade-hero-layout">
          <div className="trade-hero-copy">
            <span className="trade-hero-eyebrow">
              <span /> Rooted in quality. Connected globally.
            </span>
            <h1 id="home-title" className="trade-hero-title">
              Global Food
              <br />
              <span>Import &amp; Export</span>
            </h1>
            <p className="trade-hero-description">
              From trusted growers to global markets. We source and deliver quality food products
              with care, precision, and integrity.
            </p>
            <div className="trade-hero-actions">
              <Link to="/request-quote" className="btn-accent">
                Request a Quote <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/products" className="btn-outline-light">
                Explore Products
              </Link>
            </div>
            <div className="trade-hero-assurance">
              <span>
                <Check aria-hidden="true" /> Quality-controlled sourcing
              </span>
              <span>
                <Check aria-hidden="true" /> End-to-end logistics
              </span>
            </div>
            <dl className="trade-hero-stats" aria-label="Our global supply network at a glance">
              <div>
                <dt>Product range</dt>
                <dd>{categories.length}+</dd>
                <span>categories</span>
              </div>
              <div>
                <dt>Market reach</dt>
                <dd>8+</dd>
                <span>international markets</span>
              </div>
              <div>
                <dt>Freight options</dt>
                <dd>3</dd>
                <span>sea · air · land</span>
              </div>
            </dl>
            <div className="trade-hero-utilities">
              <a href="/leo-infinity-product-catalog.pdf" download className="trade-catalog-link">
                <Download aria-hidden="true" /> Download product catalog
              </a>
              <a href="#product-categories" className="trade-scroll-link">
                Scroll to explore <ArrowDown aria-hidden="true" />
              </a>
            </div>
          </div>
          <HeroGlobe />
        </div>
        <div className="trade-hero-markets">
          <span className="trade-hero-markets-label">
            <Globe2 aria-hidden="true" /> Connecting markets
          </span>
          <nav aria-label="Explore our market regions">
            {heroMarkets.map((market) => (
              <a key={market} href="#global-markets">
                {market}
              </a>
            ))}
          </nav>
          <Link to="/import-export">
            Explore our network <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="product-categories" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Our Catalog"
            title="Product Categories"
            action={
              <Link
                to="/products"
                className="border-b-2 border-accent pb-1 font-semibold text-primary"
              >
                Explore All Products
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to="/products"
                hash={category.slug}
                className="group cursor-pointer"
              >
                <div className="mb-4 aspect-square overflow-hidden rounded-sm bg-secondary">
                  <SmartImage
                    src={category.image}
                    alt={category.name}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-center font-medium text-primary">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HowWeWork />
      <CompanyFilm />

      <HowWeWork />
      <CompanyFilm />

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Market Essentials"
            title="Featured Products"
            action={
              <Link
                to="/products"
                className="border-b-2 border-accent pb-1 font-semibold text-primary"
              >
                View Full Catalog
              </Link>
            }
          />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <article key={product.slug} className="group rounded-sm border border-border bg-card">
                <Link
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  className="block aspect-[4/3] overflow-hidden rounded-t-sm"
                >
                  <SmartImage
                    src={product.image}
                    alt={product.name}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-primary">{product.name}</h3>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-semibold text-primary/70">Origin:</span>{" "}
                      {product.origin}
                    </p>
                    <p>
                      <span className="font-semibold text-primary/70">Packing:</span>{" "}
                      {product.packaging}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <Link
                      to="/products/$slug"
                      params={{ slug: product.slug }}
                      className="text-sm font-semibold text-primary transition-colors hover:text-accent"
                    >
                      View Details
                    </Link>
                    <Link
                      to="/request-quote"
                      className="text-sm font-bold tracking-wider text-accent uppercase transition-colors hover:text-primary"
                    >
                      Enquire Now
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <WhyChooseCards />
      <GlobalMarkets />
      <SeasonalCalendar />
      <PackagingShowcase />
      <QualityGallery />
      <HomeFaq />
      <FinalQuoteCta />
    </div>
  );
}
