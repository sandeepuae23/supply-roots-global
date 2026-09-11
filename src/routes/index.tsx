import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, Download, Globe2 } from "lucide-react";
import { HeroGlobe } from "@/components/hero-globe";
import { BusinessCredibility } from "@/components/business-credibility";
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
import { HomeProductDiscovery, ProductSpotlights } from "@/components/product-discovery";
import { categories } from "@/data/catalog";
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

      <HomeProductDiscovery />
      <HowWeWork />
      <CompanyFilm />

      <ProductSpotlights />

      <BusinessCredibility />

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
