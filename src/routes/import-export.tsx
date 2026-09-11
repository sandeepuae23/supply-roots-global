/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CheckCircle2, ClipboardCheck, Container, FileCheck2, Globe2, PackageCheck, Plane, SearchCheck, Ship, Truck, Warehouse } from "lucide-react";
import { useState } from "react";
import tradePort from "@/assets/trade-port.jpg";
import importImage from "@/assets/3d-import.jpg";
import exportImage from "@/assets/3d-export.jpg";
import tradeContainers from "@/assets/trade-containers.jpg";
import tradeInspection from "@/assets/trade-inspection.jpg";
import tradeAirFreight from "@/assets/trade-air-freight.jpg";
import warehouseOps from "@/assets/warehouse-ops.jpg";
import { SmartImage } from "@/components/smart-image";
import "@/trade-pages.css";

export const Route = createFileRoute("/import-export")({
  head: () => ({
    meta: [
      { title: "Food Import & Export Services — Leo Infinity" },
      {
        name: "description",
        content:
          "Plan food imports and exports with product sourcing, specification review, packaging, documentation and sea, air or land freight coordination.",
      },
      { property: "og:title", content: "Food Import & Export Services — Leo Infinity" },
      {
        property: "og:description",
        content: "A structured route from product brief to international shipment planning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportExportPage,
});

const directionContent = {
  import: {
    eyebrow: "Bringing products into your market",
    title: "Import coordination",
    text: "Build an import brief around the product, origin, destination rules and landed delivery requirement.",
    image: importImage,
    items: ["Origin and supplier options", "Product and pack specification", "Required document planning", "Freight and port coordination", "Destination support as scoped", "Inspection options on request"],
  },
  export: {
    eyebrow: "Moving products from origin",
    title: "Export coordination",
    text: "Turn a buyer specification into a sourcing, packing and shipment plan with a clear quotation basis.",
    image: exportImage,
    items: ["Product and origin matching", "Grade and quality requirements", "Export packaging options", "Order-linked documents", "Loading and dispatch planning", "Sea, air or land routing"],
  },
} as const;

const process = [
  { icon: SearchCheck, title: "Trade brief", text: "Product, specification, quantity, origin preference and destination." },
  { icon: ClipboardCheck, title: "Option review", text: "Available origin, pack, MOQ and transport options are assessed." },
  { icon: PackageCheck, title: "Order alignment", text: "Quality, marks, labels and inspection scope are confirmed." },
  { icon: FileCheck2, title: "Document set", text: "Applicable commercial and shipment documents are coordinated." },
  { icon: Ship, title: "Movement", text: "The agreed freight plan moves toward the named destination." },
] as const;

const modes = [
  { icon: Ship, name: "Sea freight", best: "Bulk and container loads", details: "Dry, reefer and consolidated options reviewed against product handling needs.", accent: "SEA / 01" },
  { icon: Plane, name: "Air freight", best: "Urgent and short shelf-life goods", details: "Faster movement for selected fresh products and time-sensitive requirements.", accent: "AIR / 02" },
  { icon: Truck, name: "Land freight", best: "Regional and cross-border movement", details: "Road options considered for suitable origin, destination and cargo profiles.", accent: "LAND / 03" },
] as const;

const documents = [
  { name: "Commercial invoice", stage: "Commercial", note: "Prepared for the confirmed sale" },
  { name: "Packing list", stage: "Packing", note: "Quantities, weights and pack details" },
  { name: "Certificate of origin", stage: "Origin", note: "When required for the shipment" },
  { name: "Phytosanitary / health", stage: "Compliance", note: "Product and destination dependent" },
  { name: "Inspection report", stage: "Quality", note: "When inspection is included" },
  { name: "Transport document", stage: "Freight", note: "Issued for the agreed transport mode" },
] as const;

const terms = [
  { code: "FOB", name: "Free On Board", handoff: "Named origin port", text: "The seller delivers the goods on board the nominated vessel. The buyer arranges main freight and insurance." },
  { code: "CFR", name: "Cost and Freight", handoff: "Named destination port", text: "The seller arranges ocean freight to the named port; cargo insurance remains with the buyer." },
  { code: "CIF", name: "Cost, Insurance and Freight", handoff: "Named destination port", text: "The seller arranges ocean freight and the required minimum marine insurance to the named port." },
] as const;

const tradeImages = [
  { image: tradeContainers, label: "Sea movement", note: "Container planning" },
  { image: tradeInspection, label: "Quality checkpoint", note: "Inspection option" },
  { image: tradeAirFreight, label: "Air movement", note: "Time-sensitive freight" },
  { image: warehouseOps, label: "Cargo handling", note: "Packing and dispatch" },
] as const;

function ImportExportPage() {
  const [direction, setDirection] = useState<keyof typeof directionContent>("export");
  const active = directionContent[direction];
  return (
    <div className="trade-service-page">
      <section className="service-hero" aria-labelledby="service-title">
        <SmartImage src={tradePort} alt="International container port" priority width={1920} height={1100} className="absolute inset-0 h-full w-full object-cover" />
        <div className="service-hero-overlay" />
        <div className="trade-page-shell service-hero-content">
          <span className="trade-page-eyebrow"><i /> International movement</span>
          <h1 id="service-title">A clearer route through <em>food import and export.</em></h1>
          <p>Bring product requirements, commercial terms, documents and transport planning into one connected enquiry.</p>
          <div><Link to="/request-quote" className="btn-accent">Plan a shipment <ArrowRight aria-hidden="true" /></Link><Link to="/products" className="btn-outline-light">Explore products</Link></div>
          <a href="#direction" className="service-scroll">Explore the service <ArrowDown aria-hidden="true" /></a>
        </div>
        <div className="service-hero-bar"><div className="trade-page-shell"><span><Globe2 aria-hidden="true" /> Origin matched</span><span><PackageCheck aria-hidden="true" /> Specification aligned</span><span><FileCheck2 aria-hidden="true" /> Documents scoped</span><span><Ship aria-hidden="true" /> Freight planned</span></div></div>
      </section>

      <section id="direction" className="service-direction">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Choose a direction</span><h2>Import and export support around the same buyer brief</h2></div><div className="direction-tabs" role="tablist" aria-label="Trade direction"><button type="button" role="tab" aria-selected={direction === "import"} onClick={() => setDirection("import")}>Import</button><button type="button" role="tab" aria-selected={direction === "export"} onClick={() => setDirection("export")}>Export</button></div></div>
          <div className="direction-panel" role="tabpanel">
            <div className="direction-image"><SmartImage key={active.image} src={active.image} alt={`${active.title} illustration`} width={1100} height={825} className="h-full w-full object-cover" /><span>Representative visual</span></div>
            <div className="direction-copy"><span>{active.eyebrow}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.items.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" /> {item}</li>)}</ul><Link to="/request-quote">Build a detailed enquiry <ArrowRight aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>

      <section className="service-process" aria-labelledby="trade-process-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>From request to route</span><h2 id="trade-process-title">A five-stage trade workflow</h2></div><p>Final availability, provider scope and documentation are confirmed in the quotation for the specific product and destination.</p></div>
          <ol>{process.map(({ icon: Icon, title, text }, index) => <li key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <section className="service-modes" aria-labelledby="modes-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Movement options</span><h2 id="modes-title">Match transport to the product</h2></div><p>Shelf life, volume, temperature, cost and destination determine which option enters the quotation.</p></div>
          <div className="service-mode-grid">{modes.map(({ icon: Icon, name, best, details, accent }) => <article key={name}><span>{accent}</span><Icon aria-hidden="true" /><h3>{name}</h3><strong>{best}</strong><p>{details}</p></article>)}</div>
        </div>
      </section>

      <section className="service-documents" aria-labelledby="documents-title">
        <div className="trade-page-shell service-document-layout">
          <div className="trade-page-heading"><div><span>Document planning</span><h2 id="documents-title">Know what belongs in the file</h2><p>Requirements vary by product, origin and destination. The final document set is confirmed before order commitment.</p></div><Container aria-hidden="true" /></div>
          <div className="document-list">{documents.map((item, index) => <article key={item.name}><span>0{index + 1}</span><div><small>{item.stage}</small><h3>{item.name}</h3></div><p>{item.note}</p><CheckCircle2 aria-hidden="true" /></article>)}</div>
        </div>
      </section>

      <section className="service-incoterms" aria-labelledby="incoterms-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Quotation basis</span><h2 id="incoterms-title">FOB, CFR or CIF</h2></div><p>Select a starting basis in the quote wizard. The final offer records the applicable Incoterms® rule and named port.</p></div>
          <div className="incoterm-grid">{terms.map((term) => <article key={term.code}><span>{term.code}</span><h3>{term.name}</h3><small>Handoff · {term.handoff}</small><p>{term.text}</p><Link to="/request-quote">Request this basis <ArrowRight aria-hidden="true" /></Link></article>)}</div>
        </div>
      </section>

      <section className="service-gallery" aria-labelledby="trade-context-title">
        <div className="trade-page-shell">
          <div className="trade-page-heading"><div><span>Operational context</span><h2 id="trade-context-title">The checkpoints around each shipment</h2></div><p>Representative imagery shows the operating environments considered during planning.</p></div>
          <div>{tradeImages.map((item) => <figure key={item.label}><SmartImage src={item.image} alt={item.label} width={900} height={700} className="h-full w-full object-cover" /><figcaption><small>{item.note}</small><h3>{item.label}</h3><span>Representative image</span></figcaption></figure>)}</div>
        </div>
      </section>

      <section className="service-final-cta">
        <div className="trade-page-shell"><span>Plan the commercial route</span><h2>Share the product, quantity and destination.</h2><p>Our multi-step enquiry captures the details needed to prepare the next practical response.</p><Link to="/request-quote" className="btn-accent">Start a trade enquiry <ArrowRight aria-hidden="true" /></Link></div>
      </section>
    </div>
  );
}
