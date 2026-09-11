/* eslint-disable prettier/prettier */
import { ArrowRight, BadgeCheck, Boxes, CheckCircle2, ClipboardCheck, FileCheck2, Globe2, PackageCheck, Scale, ShieldCheck, Ship, Warehouse } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SmartImage } from "@/components/smart-image";
import { categories, products } from "@/data/catalog";
import warehouseImage from "@/assets/business-warehouse.jpg";
import inspectionImage from "@/assets/trade-inspection.jpg";
import samplingImage from "@/assets/qual-sampling.jpg";
import shippingImage from "@/assets/trade-containers.jpg";
import "@/business-credibility.css";

const standards = [
  { icon: ClipboardCheck, title: "Specification review", text: "Grade, size, moisture and tolerance requirements agreed before supplier confirmation." },
  { icon: ShieldCheck, title: "Inspection support", text: "Pre-shipment and third-party inspection can be arranged according to the order." },
  { icon: FileCheck2, title: "Document coordination", text: "Commercial, origin, packing and shipment documents coordinated for the agreed destination." },
  { icon: PackageCheck, title: "Packaging checks", text: "Pack size, labels, marks and pallet requirements reviewed before dispatch." },
] as const;

const evidence = [
  { icon: Scale, title: "Quoted to specification", text: "Each enquiry records the product, quantity, unit, pack, destination and Incoterm." },
  { icon: BadgeCheck, title: "Approval before commitment", text: "Final origin, availability, documentation and pricing are confirmed in the quotation." },
  { icon: Boxes, title: "Commercial quantities visible", text: "Catalog pages show indicative MOQ and standard pack formats before buyers enquire." },
  { icon: Globe2, title: "Route options compared", text: "Sea, air and land modes are considered according to shelf life, timing and destination." },
] as const;

const photos = [
  { image: warehouseImage, title: "Warehouse handling" },
  { image: inspectionImage, title: "Product inspection" },
  { image: samplingImage, title: "Quality sampling" },
  { image: shippingImage, title: "Container movement" },
] as const;

export function BusinessCredibility() {
  return (
    <>
      <section className="credibility-overview" aria-labelledby="credibility-title">
        <div className="home-section-shell">
          <div className="credibility-intro">
            <div><span>Commercial capability</span><h2 id="credibility-title">A clearer basis for every buying decision</h2><p>Catalog depth, freight choices and a documented enquiry workflow give buyers the facts needed to begin supplier review.</p></div>
            <Link to="/request-quote" className="credibility-link">Start a detailed enquiry <ArrowRight aria-hidden="true" /></Link>
          </div>
          <dl className="credibility-stats">
            <div><dt>Product categories</dt><dd>{categories.length}</dd><span>Food and agricultural ranges</span></div>
            <div><dt>Catalog products</dt><dd>{products.length}</dd><span>With origin, pack and MOQ data</span></div>
            <div><dt>Freight modes</dt><dd>3</dd><span>Sea, air and land planning</span></div>
            <div><dt>Quote workflow</dt><dd>4</dd><span>Company, products, delivery, review</span></div>
          </dl>
          <div className="credibility-grid">
            <div className="credibility-standards"><span className="credibility-kicker">Quality and document controls</span>{standards.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}<div className="credibility-documents"><strong>Order-linked documents</strong><span>Phytosanitary · certificate of origin · health or veterinary · laboratory reports, as applicable</span></div></div>
            <div className="credibility-terms">
              <span className="credibility-kicker">Quotation bases</span>
              <h3>FOB, CFR and CIF</h3>
              <p>Request the basis that fits your procurement and freight plan. Suitability is confirmed for the product, origin and destination during quotation.</p>
              <div><span><Ship aria-hidden="true" /> FOB</span><span><Warehouse aria-hidden="true" /> CFR</span><span><Globe2 aria-hidden="true" /> CIF</span></div>
              <small>Incoterms® rules define responsibilities; the final quotation records the agreed named port or place.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="credibility-trust" aria-labelledby="trust-title">
        <div className="home-section-shell">
          <div className="credibility-intro"><div><span>Buyer evidence</span><h2 id="trust-title">Why buyers can assess us clearly</h2><p>Concrete product and order information replaces vague promises during the first buying conversation.</p></div></div>
          <div className="credibility-evidence">{evidence.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p><CheckCircle2 aria-hidden="true" className="credibility-check" /></article>)}</div>
          <div className="credibility-trade-brief">
            <div><span>Illustrative trade brief</span><h3>Indian basmati rice → Jebel Ali, UAE</h3><p>A sample buyer requirement showing how an enquiry is structured before price and availability are confirmed.</p></div>
            <ol><li><span>01</span><strong>Product</strong><p>1121 basmati · export grade</p></li><li><span>02</span><strong>Load</strong><p>20 MT · 25 kg PP bags</p></li><li><span>03</span><strong>Terms</strong><p>CIF Jebel Ali · target date supplied</p></li><li><span>04</span><strong>Review</strong><p>Specification, pack marks and documents confirmed at quote</p></li></ol>
          </div>
        </div>
      </section>

      <section className="credibility-photo-section" aria-labelledby="operations-title">
        <div className="home-section-shell">
          <div className="credibility-intro"><div><span>Operational context</span><h2 id="operations-title">From handling to shipment</h2><p>Representative images illustrate the checkpoints buyers can include in a product-specific quotation.</p></div></div>
          <div className="credibility-photos">{photos.map((item) => <figure key={item.title}><SmartImage src={item.image} alt={item.title} width={900} height={700} className="h-full w-full object-cover" /><figcaption><strong>{item.title}</strong><span>Representative image</span></figcaption></figure>)}</div>
          <div className="credibility-markets"><span>Sourcing origins in the catalog</span><div>India · UAE · Spain · Italy · Turkey · Ukraine · Argentina · Indonesia</div><span>Indicative destination planning</span><div>Gulf · Europe · Africa · South Asia · Southeast Asia</div></div>
        </div>
      </section>
    </>
  );
}
