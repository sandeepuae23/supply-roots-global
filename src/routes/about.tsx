/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Boxes, CheckCircle2, ClipboardCheck, Download, FileCheck2, Globe2, Handshake, Leaf, PackageCheck, SearchCheck, Ship, Sprout, Warehouse } from "lucide-react";
import headquarters from "@/assets/about-headquarters.jpg";
import inspection from "@/assets/about-inspection.jpg";
import partnership from "@/assets/about-partnership.jpg";
import warehouseOps from "@/assets/warehouse-ops.jpg";
import businessPort from "@/assets/business-port.jpg";
import tradeContainers from "@/assets/trade-containers.jpg";
import { SmartImage } from "@/components/smart-image";
import { categories, products } from "@/data/catalog";
import "@/about-page.css";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Leo Infinity — Global Food Trading" },
      {
        name: "description",
        content:
          "Meet Leo Infinity Global General Trading and explore our product-led approach to international food sourcing, quality coordination, packaging and logistics.",
      },
      { property: "og:title", content: "About Leo Infinity — Global Food Trading" },
      {
        property: "og:description",
        content: "A practical food trading partner connecting product requirements with origins, packaging and international delivery options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const operatingModel = [
  { icon: SearchCheck, title: "Understand", text: "We begin with product, specification, quantity, pack, destination and timing." },
  { icon: Sprout, title: "Source", text: "Suitable origin and supplier options are matched to the commercial brief." },
  { icon: ClipboardCheck, title: "Verify", text: "Grade, packing and requested inspection requirements are aligned before confirmation." },
  { icon: FileCheck2, title: "Coordinate", text: "Order-linked commercial and shipment documents are prepared as applicable." },
  { icon: Ship, title: "Move", text: "Sea, air or land options are planned around shelf life, volume and destination." },
] as const;

const capabilities = [
  { icon: Leaf, title: "Food sourcing", text: "Fresh, frozen and dry product ranges matched to buyer requirements.", className: "is-wide" },
  { icon: Boxes, title: "Bulk trading", text: "MOQ, pallet and container planning visible from the first enquiry.", className: "" },
  { icon: PackageCheck, title: "Packaging", text: "Bulk, foodservice, retail and private-label formats where suitable.", className: "" },
  { icon: Warehouse, title: "Order coordination", text: "Product, packing and dispatch checkpoints organised around the confirmed order.", className: "" },
  { icon: Globe2, title: "International logistics", text: "Origin-to-destination planning across sea, air and land freight.", className: "is-wide" },
] as const;

const values = [
  { number: "01", name: "Clarity", text: "We record the product, specification, commercial quantity and destination before pricing." },
  { number: "02", name: "Care", text: "Quality, packing and document requirements are treated as part of the order, not an afterthought." },
  { number: "03", name: "Accountability", text: "A structured enquiry and reference number create a clearer path for follow-up." },
  { number: "04", name: "Adaptability", text: "Origins, pack formats and freight modes are reviewed against each buyer’s needs." },
] as const;

const imageStories = [
  { image: inspection, title: "Inspection planning", text: "Product checks can be arranged to the agreed order brief." },
  { image: warehouseOps, title: "Handling and packaging", text: "Pack formats are selected for product protection and market use." },
  { image: tradeContainers, title: "Shipment coordination", text: "Freight planning considers volume, timing and destination." },
] as const;

function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-shell about-hero-grid">
          <div className="about-hero-copy">
            <span className="about-eyebrow"><i /> About Leo Infinity</span>
            <h1 id="about-title">Food trade shaped around <em>real requirements.</em></h1>
            <p>We connect business buyers with agricultural and food products through a specification-led process covering sourcing, packaging, documentation and international movement.</p>
            <div className="about-hero-actions">
              <Link to="/request-quote" className="btn-accent">Start an enquiry <ArrowRight aria-hidden="true" /></Link>
              <a href="/leo-infinity-product-catalog.pdf" download className="about-download"><Download aria-hidden="true" /> Company catalog</a>
            </div>
            <a href="#our-approach" className="about-scroll">Discover our approach <ArrowDown aria-hidden="true" /></a>
          </div>
          <div className="about-hero-visual">
            <SmartImage src={headquarters} alt="Leo Infinity international trade office setting" width={1200} height={1500} className="h-full w-full object-cover" />
            <div className="about-hero-frame" />
            <div className="about-hero-note"><Globe2 aria-hidden="true" /><span>Product-led sourcing<strong>Origin to destination</strong></span></div>
            <div className="about-hero-inset"><SmartImage src={inspection} alt="Representative produce inspection" width={520} height={390} className="h-full w-full object-cover" /><span>Representative image</span></div>
          </div>
        </div>
        <div className="about-shell"><dl className="about-hero-stats"><div><dt>Catalog breadth</dt><dd>{categories.length}</dd><span>food categories</span></div><div><dt>Product detail</dt><dd>{products.length}</dd><span>listed product lines</span></div><div><dt>Movement options</dt><dd>03</dd><span>sea · air · land</span></div></dl></div>
      </section>

      <section id="our-approach" className="about-introduction">
        <div className="about-shell about-intro-grid">
          <div className="about-section-heading"><span>Our point of view</span><h2>Better trade begins with a better brief.</h2></div>
          <div className="about-intro-copy"><p>Food trading works best when product quality, commercial terms and delivery constraints are defined early. That is why our process starts with the details a buyer can actually evaluate: origin, grade, pack, MOQ, documentation needs, destination and Incoterm.</p><p>From there, we help shape a practical supply option and confirm the final commercial details in the quotation. This gives procurement teams a clearer basis for comparison and follow-up.</p><Link to="/products">Explore the product catalog <ArrowRight aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="about-purpose" aria-labelledby="purpose-title">
        <div className="about-shell">
          <div className="about-purpose-title"><span>Purpose and direction</span><h2 id="purpose-title">What guides the company</h2></div>
          <div className="about-purpose-grid">
            <article><span>Mission</span><h3>Make international food sourcing easier to evaluate and coordinate.</h3><p>We organise the key product, quality, packaging and delivery information buyers need before making a commercial commitment.</p><i>01</i></article>
            <article><span>Vision</span><h3>Build enduring trade relationships through clarity and practical execution.</h3><p>We aim to create repeatable buying workflows that respect each product, origin, destination and partner requirement.</p><i>02</i></article>
          </div>
        </div>
      </section>

      <section className="about-model" aria-labelledby="model-title">
        <div className="about-shell">
          <div className="about-model-heading"><div className="about-section-heading"><span>Our operating model</span><h2 id="model-title">One connected path from enquiry to movement</h2></div><p>Every stage builds on the buyer brief, so the quotation and operational plan stay aligned.</p></div>
          <ol>{operatingModel.map(({ icon: Icon, title, text }, index) => <li key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <section className="about-capabilities" aria-labelledby="capabilities-title">
        <div className="about-shell about-capabilities-layout">
          <div className="about-section-heading"><span>Connected capabilities</span><h2 id="capabilities-title">The practical work behind every order</h2><p>Capabilities are configured for the product and destination, with final scope confirmed during quotation.</p><Link to="/import-export">View trade services <ArrowRight aria-hidden="true" /></Link></div>
          <div className="about-capability-grid">{capabilities.map(({ icon: Icon, title, text, className }) => <article key={title} className={className}><Icon aria-hidden="true" /><span><h3>{title}</h3><p>{text}</p></span><ArrowRight aria-hidden="true" /></article>)}</div>
        </div>
      </section>

      <section className="about-in-action" aria-labelledby="action-title">
        <div className="about-shell">
          <div className="about-action-heading"><div className="about-section-heading"><span>Operational context</span><h2 id="action-title">The work around the product</h2></div><p>Representative images illustrate the checkpoints that can form part of a product-specific order.</p></div>
          <div className="about-story-grid">{imageStories.map((item, index) => <figure key={item.title}><SmartImage src={item.image} alt={item.title} width={1000} height={760} className="h-full w-full object-cover" /><figcaption><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p><small>Representative image</small></div></figcaption></figure>)}</div>
        </div>
      </section>

      <section className="about-values" aria-labelledby="values-title">
        <div className="about-shell">
          <div className="about-values-intro"><div className="about-section-heading"><span>How we show up</span><h2 id="values-title">Values translated into buyer experience</h2></div><p>These principles shape the information we request, the options we present and the way we follow an enquiry through.</p></div>
          <div className="about-values-grid">{values.map((value) => <article key={value.name}><span>{value.number}</span><CheckCircle2 aria-hidden="true" /><h3>{value.name}</h3><p>{value.text}</p></article>)}</div>
          <div className="about-value-band"><Handshake aria-hidden="true" /><p><strong>Built for business buyers</strong> Importers · distributors · retailers · foodservice · manufacturers</p></div>
        </div>
      </section>

      <section className="about-partnership" aria-labelledby="partnership-title">
        <div className="about-shell about-partnership-grid">
          <div className="about-partnership-image"><SmartImage src={partnership} alt="Representative international food trading discussion" width={1200} height={900} className="h-full w-full object-cover" /><span>Representative image</span></div>
          <div><div className="about-section-heading"><span>Working together</span><h2 id="partnership-title">A useful first conversation starts with specifics.</h2></div><p>Tell us the product, grade, quantity, packaging, destination port and preferred delivery date. We will use that brief to prepare the next practical step.</p><ul><li><CheckCircle2 aria-hidden="true" /> Select several products in one enquiry</li><li><CheckCircle2 aria-hidden="true" /> Attach specifications or reference images</li><li><CheckCircle2 aria-hidden="true" /> Receive a unique follow-up reference</li></ul><Link to="/request-quote" className="btn-primary">Build your quote request <ArrowRight aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="about-final-cta">
        <SmartImage src={businessPort} alt="International cargo port at sunset" width={1920} height={900} className="absolute inset-0 h-full w-full object-cover" />
        <div className="about-final-overlay" />
        <div className="about-shell"><span>Start with your requirement</span><h2>Let’s turn a product brief into a practical trade enquiry.</h2><p>Explore the catalog or send the trade desk your product, quantity and destination.</p><div><Link to="/request-quote" className="btn-accent">Request a quote <ArrowRight aria-hidden="true" /></Link><Link to="/contact" className="btn-outline-light">Contact the trade desk</Link></div></div>
      </section>
    </div>
  );
}
