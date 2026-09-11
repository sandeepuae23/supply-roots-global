/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Boxes, Building2, CheckCircle2, ClipboardList, Container, Download, Factory, Globe2, Hotel, PackageCheck, ShoppingBasket, Store, UsersRound, Warehouse } from "lucide-react";
import { useState } from "react";
import businessPort from "@/assets/business-port.jpg";
import businessWarehouse from "@/assets/business-warehouse.jpg";
import aboutPartnership from "@/assets/about-partnership.jpg";
import tradeInspection from "@/assets/trade-inspection.jpg";
import { SmartImage } from "@/components/smart-image";
import { RouteTimeline } from "@/components/route-timeline";
import { categories, products } from "@/data/catalog";
import "@/trade-pages.css";

export const Route = createFileRoute("/business-clients")({
  head: () => ({
    meta: [
      { title: "Business & Wholesale Food Supply — Leo Infinity" },
      {
        name: "description",
        content:
          "Explore product sourcing, bulk quantities, packaging options and international logistics for importers, distributors, retailers, foodservice and manufacturers.",
      },
      { property: "og:title", content: "Business & Wholesale Food Supply — Leo Infinity" },
      {
        property: "og:description",
        content: "A structured wholesale food enquiry experience for professional buyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessClientsPage,
});

const buyerSegments = [
  { id: "importers", icon: Globe2, name: "Importers & distributors", title: "Build destination-ready product briefs", text: "Compare origin, MOQ, packaging and freight options across several products before requesting a commercial offer.", needs: ["Multi-product selection", "Destination port and Incoterm", "Commercial quantity planning", "Document requirements"] },
  { id: "retail", icon: ShoppingBasket, name: "Retail & supermarkets", title: "Plan pack formats for the shelf", text: "Review product ranges and discuss consumer pack sizes, labeling and private-label options where suitable.", needs: ["Retail and outer packs", "Private-label enquiry", "Seasonal planning", "Repeat supply discussions"] },
  { id: "foodservice", icon: Hotel, name: "Hotels & foodservice", title: "Source practical formats for operations", text: "Build enquiries around foodservice quantities, consistent specifications and delivery windows.", needs: ["Foodservice pack sizes", "Several products per request", "Delivery-date preference", "Specification uploads"] },
  { id: "manufacturing", icon: Factory, name: "Food manufacturers", title: "Define inputs before pricing", text: "Share variety, grade, moisture, tolerance and packaging requirements for a more precise supplier review.", needs: ["Technical specifications", "Bulk and contract volumes", "Reference file uploads", "Inspection scope"] },
  { id: "wholesale", icon: Store, name: "Wholesalers", title: "Compare market-ready supply options", text: "Use visible MOQ and packaging data to shortlist products and build a combined trade enquiry.", needs: ["Catalog comparison", "Bulk packaging", "Origin alternatives", "Freight-mode review"] },
] as const;

const procurementSteps = [
  { icon: ClipboardList, title: "Build the requirement", text: "Select products, quantities, pack formats and destination details." },
  { icon: Boxes, title: "Review the commercial unit", text: "MOQ, unit and container assumptions are clarified before pricing." },
  { icon: PackageCheck, title: "Align product and pack", text: "Specification, labels, marks and any inspection request are recorded." },
  { icon: Container, title: "Plan the movement", text: "Transport and Incoterm options are matched to the destination." },
] as const;

const supplyFormats = [
  { label: "Retail", range: "500 g – 5 kg", text: "Consumer-facing formats where suitable" },
  { label: "Foodservice", range: "5 kg – 25 kg", text: "Practical kitchen and catering formats" },
  { label: "Bulk", range: "25 kg – 1 MT", text: "Bags, cartons, drums and jumbo formats" },
  { label: "Container", range: "20' / 40'", text: "Product-specific load and handling plans" },
] as const;

function BusinessClientsPage() {
  const [activeSegment, setActiveSegment] = useState(0);
  const segment = buyerSegments[activeSegment]!;
  const SegmentIcon = segment.icon;
  return (
    <div className="business-page">
      <section className="business-hero" aria-labelledby="business-title">
        <div className="business-hero-image"><SmartImage src={businessPort} alt="International business cargo port" priority width={1920} height={1200} className="h-full w-full object-cover" /></div>
        <div className="business-hero-overlay" />
        <div className="trade-page-shell business-hero-content">
          <span className="trade-page-eyebrow"><i /> For professional buyers</span>
          <h1 id="business-title">Wholesale food supply built around <em>your buying brief.</em></h1>
          <p>Explore products, compare commercial details and prepare one structured enquiry for your company, market and destination.</p>
          <div><Link to="/request-quote" className="btn-accent">Build a business enquiry <ArrowRight aria-hidden="true" /></Link><a href="/leo-infinity-product-specifications.pdf" download className="btn-outline-light"><Download aria-hidden="true" /> Product specifications</a></div>
          <a href="#buyer-segments" className="service-scroll">Find your buying model <ArrowDown aria-hidden="true" /></a>
        </div>
        <dl className="business-hero-stats"><div><dt>Categories</dt><dd>{categories.length}</dd><span>across fresh, frozen and dry ranges</span></div><div><dt>Product lines</dt><dd>{products.length}</dd><span>with origin, pack and MOQ details</span></div><div><dt>Enquiry format</dt><dd>Multi</dd><span>several products in one request</span></div></dl>
      </section>

      <section id="buyer-segments" className="business-segments" aria-labelledby="segments-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Who we support</span><h2 id="segments-title">A different buying context needs a different brief</h2></div><p>Select your business type to see the information that matters most at the start of an enquiry.</p></div>
          <div className="segment-layout">
            <div className="segment-tabs" role="tablist" aria-label="Business buyer types">{buyerSegments.map(({ icon: Icon, name }, index) => <button key={name} type="button" role="tab" aria-selected={activeSegment === index} onClick={() => setActiveSegment(index)}><Icon aria-hidden="true" /><span>{name}</span><ArrowRight aria-hidden="true" /></button>)}</div>
            <div className="segment-panel" role="tabpanel"><span>Buyer model / 0{activeSegment + 1}</span><SegmentIcon aria-hidden="true" /><h3>{segment.title}</h3><p>{segment.text}</p><ul>{segment.needs.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" /> {item}</li>)}</ul><Link to="/request-quote">Start this enquiry <ArrowRight aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>

      <section className="business-procurement" aria-labelledby="procurement-title">
        <div className="trade-page-shell business-procurement-layout">
          <div className="business-procurement-photo"><SmartImage src={businessWarehouse} alt="Representative wholesale warehouse environment" width={1200} height={1000} className="h-full w-full object-cover" /><span>Representative image</span><div><Warehouse aria-hidden="true" /><strong>Built for commercial quantities</strong><small>MOQ and pack information visible in the catalog</small></div></div>
          <div><div className="trade-page-heading"><div><span>Procurement workflow</span><h2 id="procurement-title">Move from browsing to a usable requirement</h2></div></div><div className="procurement-list">{procurementSteps.map(({ icon: Icon, title, text }, index) => <article key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><Link to="/products" className="business-text-link">Search and compare products <ArrowRight aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="business-formats" aria-labelledby="formats-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Packaging discussion</span><h2 id="formats-title">Supply formats for different channels</h2></div><p>These are planning ranges. Product suitability, pack availability and private-label scope are confirmed in the quotation.</p></div>
          <div className="supply-format-grid">{supplyFormats.map((item, index) => <article key={item.label}><span>0{index + 1}</span><PackageCheck aria-hidden="true" /><h3>{item.label}</h3><strong>{item.range}</strong><p>{item.text}</p></article>)}</div>
        </div>
      </section>

      <section className="business-route" aria-labelledby="route-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>International movement</span><h2 id="route-title">Explore representative trade lanes</h2></div><p>Use the controls to compare sea, air and land routes. Routes are illustrative; shipment availability is confirmed per enquiry.</p></div>
          <RouteTimeline />
        </div>
      </section>

      <section className="business-proof" aria-labelledby="buyer-tools-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Buyer tools</span><h2 id="buyer-tools-title">Useful information before the sales conversation</h2></div><p>The site now gives procurement teams a clearer starting point without waiting for a generic callback.</p></div>
          <div className="business-tool-grid"><article><span>01</span><h3>Product comparison</h3><p>Compare origin, variety, grade, packaging, MOQ and shipping for up to three products.</p><Link to="/products">Compare products <ArrowRight aria-hidden="true" /></Link></article><article><span>02</span><h3>Specification booklet</h3><p>Review 69 catalog entries across 12 categories in one downloadable document.</p><a href="/leo-infinity-product-specifications.pdf" download>Download specifications <Download aria-hidden="true" /></a></article><article><span>03</span><h3>Trackable enquiry</h3><p>Create a multi-product request with commercial terms and receive a unique reference.</p><Link to="/request-quote">Open quote wizard <ArrowRight aria-hidden="true" /></Link></article></div>
        </div>
      </section>

      <section className="business-partnership" aria-labelledby="business-partnership-title">
        <div className="trade-page-shell business-partnership-grid">
          <div><div className="trade-page-heading"><div><span>Commercial collaboration</span><h2 id="business-partnership-title">Build the first brief together</h2></div></div><p>The fastest way to get a useful response is to share the product specification, volume, destination, packaging and required timing. Reference images or documents can be attached in the quote wizard.</p><ul><li><UsersRound aria-hidden="true" /><span><strong>Buyer context</strong>Company, market and preferred contact method</span></li><li><Building2 aria-hidden="true" /><span><strong>Commercial context</strong>Quantity units, destination port and Incoterm</span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>Product context</strong>Grade, packaging and reference-file upload</span></li></ul><Link to="/request-quote" className="btn-primary">Become a business buyer <ArrowRight aria-hidden="true" /></Link></div>
          <div className="business-partnership-photo"><SmartImage src={aboutPartnership} alt="Representative business sourcing conversation" width={1100} height={1000} className="h-full w-full object-cover" /><span>Representative image</span><SmartImage src={tradeInspection} alt="Representative product inspection" width={520} height={390} className="business-partnership-inset object-cover" /></div>
        </div>
      </section>

      <section className="business-final-cta"><div className="trade-page-shell"><span>Ready to create a business requirement?</span><h2>Put every product, quantity and destination into one enquiry.</h2><div><Link to="/request-quote" className="btn-accent">Start now <ArrowRight aria-hidden="true" /></Link><Link to="/contact" className="btn-outline-light">Contact the trade desk</Link></div></div></section>
    </div>
  );
}
