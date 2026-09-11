/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CheckCircle2, ChevronDown, ClipboardCheck, FileCheck2, FlaskConical, Leaf, PackageCheck, ScanSearch, ShieldCheck, Snowflake, Sprout, Wheat } from "lucide-react";
import { useState } from "react";
import qualityLab from "@/assets/quality-lab.jpg";
import qualLabTesting from "@/assets/qual-lab-testing.jpg";
import qualInspection from "@/assets/qual-inspection.jpg";
import qualAudit from "@/assets/qual-audit.jpg";
import qualSampling from "@/assets/qual-sampling.jpg";
import warehouseOps from "@/assets/warehouse-ops.jpg";
import tradeContainers from "@/assets/trade-containers.jpg";
import { SmartImage } from "@/components/smart-image";
import "@/quality-page.css";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Quality & Documentation Support — Leo Infinity" },
      {
        name: "description",
        content:
          "Explore product specifications, inspection options, sampling, packaging checks and order-linked documentation for international food enquiries.",
      },
      { property: "og:title", content: "Quality & Documentation Support — Leo Infinity" },
      {
        property: "og:description",
        content: "A specification-led quality workflow configured for each product, origin and destination.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QualityPage,
});

const productPlans = {
  fresh: {
    icon: Sprout,
    label: "Fresh produce",
    title: "Protect condition and shelf life",
    text: "Fresh-product briefs can cover variety, size, maturity, visual condition, pack ventilation and temperature requirements.",
    metrics: ["Variety and size", "Maturity or colour", "Visual condition", "Temperature", "Ventilated packing", "Transit window"],
  },
  dry: {
    icon: Wheat,
    label: "Dry commodities",
    title: "Define measurable product tolerances",
    text: "Dry-product briefs can specify grade, moisture, purity, grain or count parameters, foreign matter and packing format.",
    metrics: ["Grade and variety", "Moisture", "Purity", "Foreign matter", "Count or grain size", "Bag specification"],
  },
  frozen: {
    icon: Snowflake,
    label: "Frozen products",
    title: "Align specification and cold handling",
    text: "Frozen-product briefs can capture format, grade, pack size, temperature expectation and cold-chain handling needs.",
    metrics: ["Product format", "Grade and cut", "Pack weight", "Temperature", "Carton marks", "Cold handling"],
  },
} as const;

const checkpoints = [
  { icon: ScanSearch, title: "Specification review", text: "Buyer requirements are captured before sourcing and pricing." },
  { icon: ClipboardCheck, title: "Supplier and product option", text: "Origin, availability and proposed product details are reviewed." },
  { icon: FlaskConical, title: "Sampling or testing", text: "Samples and laboratory parameters can be included when required." },
  { icon: PackageCheck, title: "Packing and loading", text: "Pack format, labels, marks and loading checks follow the agreed brief." },
  { icon: FileCheck2, title: "Document confirmation", text: "The applicable order and shipment documents are confirmed before commitment." },
] as const;

const documentItems = [
  { title: "Commercial invoice", timing: "Confirmed order", status: "Core commercial document" },
  { title: "Packing list", timing: "Before dispatch", status: "Weights, packs and quantities" },
  { title: "Certificate of origin", timing: "As applicable", status: "Origin or destination dependent" },
  { title: "Phytosanitary certificate", timing: "As applicable", status: "Product and destination dependent" },
  { title: "Health or veterinary certificate", timing: "As applicable", status: "Product and destination dependent" },
  { title: "Laboratory analysis", timing: "On request", status: "Parameters agreed for the order" },
  { title: "Third-party inspection report", timing: "On request", status: "Scope agreed before inspection" },
  { title: "Transport document", timing: "At shipment", status: "Issued for the chosen freight mode" },
] as const;

const gallery = [
  { image: qualInspection, title: "Pre-shipment inspection", text: "Product, quantity and packing checks can be defined for the confirmed order." },
  { image: qualSampling, title: "Representative sampling", text: "Sample scope and acceptance parameters can be recorded before evaluation." },
  { image: qualLabTesting, title: "Laboratory analysis", text: "Testing can be arranged against specified product parameters when required." },
  { image: qualAudit, title: "Process review", text: "Handling and process checkpoints can form part of supplier assessment." },
] as const;

const faqs = [
  { question: "Is every product tested in a laboratory?", answer: "Testing depends on the product, buyer specification and destination requirements. Requested parameters and the issuing laboratory should be agreed before order confirmation." },
  { question: "Can a third-party inspection be arranged?", answer: "A third-party inspection can be requested. The agency, inspection scope, timing and cost need to be confirmed in the quotation or order terms." },
  { question: "Which certificates are included?", answer: "The document set varies by product, origin and destination. The quotation should state which certificates or reports are applicable and available for the specific shipment." },
  { question: "Can we provide our own specification?", answer: "Yes. The quote wizard accepts PDF or image references so your team can share grade, packing, label or inspection requirements with the enquiry." },
] as const;

function QualityPage() {
  const [productType, setProductType] = useState<keyof typeof productPlans>("fresh");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const plan = productPlans[productType];
  const PlanIcon = plan.icon;
  const selectedImage = gallery[galleryIndex]!;

  return (
    <div className="quality-page">
      <section className="quality-hero" aria-labelledby="quality-title">
        <div className="quality-shell quality-hero-grid">
          <div className="quality-hero-copy">
            <span className="quality-eyebrow"><i /> Quality by specification</span>
            <h1 id="quality-title">Make quality requirements <em>clear before commitment.</em></h1>
            <p>Define the product, tolerance, packing, inspection and document requirements that matter to your market. Final scope is confirmed for each quotation.</p>
            <div><Link to="/request-quote" className="btn-accent">Add quality requirements <ArrowRight aria-hidden="true" /></Link><a href="#quality-planner" className="quality-secondary-link">Explore the workflow <ArrowDown aria-hidden="true" /></a></div>
          </div>
          <div className="quality-hero-image"><SmartImage src={qualityLab} alt="Representative food laboratory quality review" priority width={1250} height={1450} className="h-full w-full object-cover" /><span>Representative image</span><div><FlaskConical aria-hidden="true" /><p>Buyer-defined specification<strong>Product · pack · checks · documents</strong></p></div></div>
        </div>
        <div className="quality-shell quality-hero-band"><span><ScanSearch aria-hidden="true" /> Specification first</span><span><ClipboardCheck aria-hidden="true" /> Scope agreed</span><span><PackageCheck aria-hidden="true" /> Packing aligned</span><span><FileCheck2 aria-hidden="true" /> Documents confirmed</span></div>
      </section>

      <section id="quality-planner" className="quality-planner" aria-labelledby="planner-title">
        <div className="quality-shell">
          <div className="quality-heading"><div><span>Product quality planner</span><h2 id="planner-title">Start with the product type</h2></div><p>Choose a product family to see typical checkpoints that can be added to an enquiry.</p></div>
          <div className="quality-plan-layout">
            <div className="quality-plan-tabs" role="tablist" aria-label="Product quality plan">{Object.entries(productPlans).map(([key, item]) => { const Icon = item.icon; return <button key={key} type="button" role="tab" aria-selected={productType === key} onClick={() => setProductType(key as keyof typeof productPlans)}><Icon aria-hidden="true" /><span>{item.label}</span><ArrowRight aria-hidden="true" /></button>; })}</div>
            <div className="quality-plan-panel" role="tabpanel"><span>Suggested brief</span><PlanIcon aria-hidden="true" /><h3>{plan.title}</h3><p>{plan.text}</p><div>{plan.metrics.map((metric) => <span key={metric}><CheckCircle2 aria-hidden="true" /> {metric}</span>)}</div><Link to="/request-quote">Use the quote wizard <ArrowRight aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>

      <section className="quality-checkpoints" aria-labelledby="checkpoints-title">
        <div className="quality-shell">
          <div className="quality-heading"><div><span>Quality control path</span><h2 id="checkpoints-title">Five checkpoints that keep the brief aligned</h2></div><p>Each checkpoint is configured to the agreed product and order rather than treated as a universal promise.</p></div>
          <ol>{checkpoints.map(({ icon: Icon, title, text }, index) => <li key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <section className="quality-specification" aria-labelledby="spec-title">
        <div className="quality-shell quality-spec-layout">
          <div className="quality-spec-image"><SmartImage src={warehouseOps} alt="Representative food handling and packaging environment" width={1200} height={1050} className="h-full w-full object-cover" /><span>Representative image</span></div>
          <div><div className="quality-heading"><div><span>Specification-led review</span><h2 id="spec-title">Turn “good quality” into measurable details</h2></div></div><p className="quality-spec-intro">The catalog provides a starting point. Your quotation can then record the exact commercial parameters required for acceptance.</p><dl><div><dt>Identity</dt><dd>Product · variety · origin</dd></div><div><dt>Physical criteria</dt><dd>Grade · size · count · appearance</dd></div><div><dt>Measured criteria</dt><dd>Moisture · purity · tolerance</dd></div><div><dt>Packaging</dt><dd>Material · weight · marks · labels</dd></div><div><dt>Inspection</dt><dd>Scope · agency · timing · acceptance</dd></div><div><dt>Delivery</dt><dd>Mode · temperature · destination · date</dd></div></dl><Link to="/products">Review product specifications <ArrowRight aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="quality-documents" aria-labelledby="quality-documents-title">
        <div className="quality-shell">
          <div className="quality-heading"><div><span>Order-linked documents</span><h2 id="quality-documents-title">A document set matched to the shipment</h2></div><p>Items below describe possible documentation support. Availability and issuing authority must be confirmed for the product, origin and destination.</p></div>
          <div className="quality-document-list">{documentItems.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><small>{item.timing}</small><h3>{item.title}</h3></div><p>{item.status}</p><CheckCircle2 aria-hidden="true" /></article>)}</div>
          <div className="quality-document-note"><ShieldCheck aria-hidden="true" /><p><strong>Certification evidence</strong> Approved company certificates or accreditations should only be displayed after the issuing body, scope and validity date have been verified.</p></div>
        </div>
      </section>

      <section className="quality-gallery" aria-labelledby="gallery-title">
        <div className="quality-shell">
          <div className="quality-heading"><div><span>Operational context</span><h2 id="gallery-title">Explore the quality checkpoints</h2></div><p>Select an image to review how each quality activity can fit into an order brief.</p></div>
          <div className="quality-gallery-layout">
            <figure><SmartImage key={selectedImage.image} src={selectedImage.image} alt={selectedImage.title} width={1250} height={900} className="h-full w-full object-cover" /><figcaption><span>0{galleryIndex + 1}</span><div><h3>{selectedImage.title}</h3><p>{selectedImage.text}</p><small>Representative image</small></div></figcaption></figure>
            <div role="tablist" aria-label="Quality checkpoint gallery">{gallery.map((item, index) => <button key={item.title} type="button" role="tab" aria-selected={galleryIndex === index} onClick={() => setGalleryIndex(index)}><SmartImage src={item.image} alt="" width={300} height={220} className="h-full w-full object-cover" /><span><small>0{index + 1}</small><strong>{item.title}</strong></span></button>)}</div>
          </div>
        </div>
      </section>

      <section className="quality-loading" aria-labelledby="loading-title">
        <SmartImage src={tradeContainers} alt="Representative international container loading environment" width={1920} height={900} className="absolute inset-0 h-full w-full object-cover" />
        <div className="quality-loading-overlay" />
        <div className="quality-shell"><span>Final handoff</span><h2 id="loading-title">Quality planning continues through packing and loading.</h2><p>Pack integrity, marks, quantities, handling and loading checks can be included according to the confirmed inspection scope.</p><Link to="/import-export" className="btn-outline-light">Explore shipment planning <ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <section className="quality-faq" aria-labelledby="quality-faq-title">
        <div className="quality-shell quality-faq-grid"><div className="quality-heading"><div><span>Buyer questions</span><h2 id="quality-faq-title">Clarify quality before you quote</h2><p>Use these answers as a starting point, then include your exact requirements with the product enquiry.</p></div></div><div>{faqs.map((item, index) => <article key={item.question} className={openFaq === index ? "is-open" : ""}><h3><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>{item.question}<ChevronDown aria-hidden="true" /></button></h3>{openFaq === index && <p>{item.answer}</p>}</article>)}</div></div>
      </section>

      <section className="quality-final-cta"><div className="quality-shell"><Leaf aria-hidden="true" /><span>Build the quality brief</span><h2>Tell us what the product must meet.</h2><p>Add specifications, quantity, destination, inspection needs and reference files to one structured enquiry.</p><div><Link to="/request-quote" className="btn-accent">Start a quality-led enquiry <ArrowRight aria-hidden="true" /></Link><Link to="/contact" className="btn-outline-light">Ask the trade desk</Link></div></div></section>
    </div>
  );
}
