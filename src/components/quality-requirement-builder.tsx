/* eslint-disable prettier/prettier */
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, Download, FileDown, FileText, FlaskConical, PackageCheck, Printer, RotateCcw, Save, Send, TestTube2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { categories, products } from "@/data/catalog";
import { getProductKind } from "@/lib/product-utils";
import { formatQualityBrief, QUALITY_BRIEF_KEY, type QualityBrief } from "@/lib/quality-brief";
import "@/quality-builder.css";

const inspectionOptions = ["Supplier or process review", "Production check", "Pre-shipment inspection", "Container loading check"];
const testOptions = ["Moisture", "Purity / foreign matter", "Residue analysis", "Microbiological", "Physical size / count", "Buyer-defined parameter"];
const documentOptions = ["Certificate of origin", "Phytosanitary certificate", "Health certificate", "Veterinary certificate", "Laboratory analysis", "Inspection report", "Fumigation certificate", "Transport document"];

const defaultBrief: QualityBrief = {
  version: 1,
  category: categories[0]?.slug ?? "",
  product: products[0]?.slug ?? "",
  grade: "",
  variety: "",
  sizeCount: "",
  moisture: "",
  purity: "",
  temperature: "",
  packaging: "",
  inspectionStages: [],
  tests: [],
  documents: [],
  sampleRequested: false,
  sampleQuantity: "",
  courierDestination: "",
  targetDate: "",
  notes: "",
};

const templates = [
  { icon: FileText, title: "Product specification", text: "Define product, physical, measured, packaging and delivery criteria.", href: "/quality-specification-template.csv" },
  { icon: ClipboardCheck, title: "Pre-shipment inspection", text: "Record evidence and acceptance criteria for packing and loading checks.", href: "/pre-shipment-inspection-template.csv" },
  { icon: Send, title: "Sample request", text: "Capture sample quantity, tests, courier destination and required timing.", href: "/sample-request-template.csv" },
] as const;

export function QualityRequirementBuilder() {
  const [brief, setBrief] = useState<QualityBrief>(defaultBrief);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(QUALITY_BRIEF_KEY);
      if (stored) setBrief({ ...defaultBrief, ...(JSON.parse(stored) as QualityBrief) });
    } catch {
      window.localStorage.removeItem(QUALITY_BRIEF_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(QUALITY_BRIEF_KEY, JSON.stringify({ ...brief, savedAt: new Date().toISOString() }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [brief, ready]);

  const categoryProducts = useMemo(() => products.filter((item) => item.category === brief.category), [brief.category]);
  const selectedProduct = products.find((item) => item.slug === brief.product) ?? categoryProducts[0];
  const readiness = [brief.product, brief.grade || brief.variety, brief.packaging, brief.inspectionStages.length, brief.documents.length, !brief.sampleRequested || brief.sampleQuantity].filter(Boolean).length;
  const progress = Math.round((readiness / 6) * 100);

  function update<K extends keyof QualityBrief>(key: K, value: QualityBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: "inspectionStages" | "tests" | "documents", value: string) {
    const current = brief[key];
    update(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function saveNow() {
    window.localStorage.setItem(QUALITY_BRIEF_KEY, JSON.stringify({ ...brief, savedAt: new Date().toISOString() }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function applySuggestions() {
    if (!selectedProduct) return;
    const kind = getProductKind(selectedProduct);
    setBrief((current) => ({
      ...current,
      grade: selectedProduct.grade,
      variety: selectedProduct.variety,
      moisture: selectedProduct.moisture,
      packaging: selectedProduct.packaging,
      temperature: kind === "frozen" ? "Confirm frozen handling temperature" : kind === "fresh" ? "Confirm product-specific handling temperature" : "Dry, protected storage and transit",
    }));
  }

  function continueToQuote() {
    saveNow();
    const productParam = selectedProduct ? `products=${encodeURIComponent(selectedProduct.slug)}&` : "";
    window.location.href = `/request-quote?${productParam}quality=1`;
  }

  return (
    <section className="quality-builder-section" aria-labelledby="quality-builder-title">
      <div className="quality-shell">
        <div className="quality-heading"><div><span>Interactive quality brief</span><h2 id="quality-builder-title">Build your own acceptance checklist</h2></div><p>Select a product, add inspection and document requirements, then carry the completed brief into the quote wizard.</p></div>

        <div className="quality-builder-progress" aria-label={`Quality brief ${progress}% complete`}><div><span>Brief readiness</span><strong>{progress}%</strong></div><div><i style={{ width: `${progress}%` }} /></div><small>{saved ? "Draft saved" : "Saved locally on this device"}</small></div>

        <div className="quality-builder-layout">
          <aside className="quality-builder-nav" aria-label="Quality brief sections"><a href="#builder-product"><span>01</span> Product</a><a href="#builder-specification"><span>02</span> Specification</a><a href="#builder-inspection"><span>03</span> Inspection</a><a href="#builder-documents"><span>04</span> Documents</a><a href="#builder-sample"><span>05</span> Sample</a></aside>
          <div className="quality-builder-form">
            <section id="builder-product" className="quality-builder-card"><div className="quality-builder-card-title"><span>01</span><div><h3>Choose the product</h3><p>Product data provides a starting point for the buyer specification.</p></div><PackageCheck aria-hidden="true" /></div><div className="quality-builder-grid"><label>Product category<select value={brief.category} onChange={(event) => { const category = event.target.value; const first = products.find((item) => item.category === category); setBrief((current) => ({ ...current, category, product: first?.slug ?? "" })); }}>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><label>Product<select value={selectedProduct?.slug ?? ""} onChange={(event) => update("product", event.target.value)}>{categoryProducts.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label></div>{selectedProduct && <div className="quality-product-summary"><div><span>Catalog origin</span><strong>{selectedProduct.origin}</strong></div><div><span>Indicative MOQ</span><strong>{selectedProduct.moq}</strong></div><div><span>Freight options</span><strong>{selectedProduct.shipping}</strong></div><button type="button" onClick={applySuggestions}>Apply catalog suggestions <ArrowRight aria-hidden="true" /></button></div>}</section>

            <section id="builder-specification" className="quality-builder-card"><div className="quality-builder-card-title"><span>02</span><div><h3>Define acceptance details</h3><p>Use exact values where your procurement or quality team has fixed requirements.</p></div><TestTube2 aria-hidden="true" /></div><div className="quality-builder-grid quality-builder-grid-three"><label>Grade<input value={brief.grade} onChange={(event) => update("grade", event.target.value)} placeholder="e.g. Export grade" /></label><label>Variety or type<input value={brief.variety} onChange={(event) => update("variety", event.target.value)} placeholder="Product variety" /></label><label>Size or count<input value={brief.sizeCount} onChange={(event) => update("sizeCount", event.target.value)} placeholder="e.g. 45–70 mm" /></label><label>Moisture<input value={brief.moisture} onChange={(event) => update("moisture", event.target.value)} placeholder="Maximum or range" /></label><label>Purity or tolerance<input value={brief.purity} onChange={(event) => update("purity", event.target.value)} placeholder="Foreign matter, broken, residue…" /></label><label>Temperature<input value={brief.temperature} onChange={(event) => update("temperature", event.target.value)} placeholder="Storage or transit requirement" /></label><label className="quality-builder-wide">Packaging specification<textarea rows={3} value={brief.packaging} onChange={(event) => update("packaging", event.target.value)} placeholder="Material, pack weight, labels and marks" /></label></div></section>

            <section id="builder-inspection" className="quality-builder-card"><div className="quality-builder-card-title"><span>03</span><div><h3>Select inspection and testing <small className="quality-live-count">{brief.inspectionStages.length}/{inspectionOptions.length} stages · {brief.tests.length}/{testOptions.length} tests</small></h3><p>Final agency, scope, timing, parameters and cost are confirmed in the quotation.</p></div><FlaskConical aria-hidden="true" /></div><div className="quality-option-columns"><fieldset><legend>Inspection stages</legend>{inspectionOptions.map((item) => <label key={item} className={brief.inspectionStages.includes(item) ? "is-selected" : ""}><input type="checkbox" checked={brief.inspectionStages.includes(item)} onChange={() => toggle("inspectionStages", item)} /><span>{brief.inspectionStages.includes(item) && <Check aria-hidden="true" />}</span>{item}</label>)}</fieldset><fieldset><legend>Testing parameters</legend>{testOptions.map((item) => <label key={item} className={brief.tests.includes(item) ? "is-selected" : ""}><input type="checkbox" checked={brief.tests.includes(item)} onChange={() => toggle("tests", item)} /><span>{brief.tests.includes(item) && <Check aria-hidden="true" />}</span>{item}</label>)}</fieldset></div></section>

            <section id="builder-documents" className="quality-builder-card"><div className="quality-builder-card-title"><span>04</span><div><h3>Request the document set <small className="quality-live-count">{brief.documents.length}/{documentOptions.length} selected</small></h3><p>Selection records buyer needs; availability remains product, origin and destination dependent.</p></div><FileDown aria-hidden="true" /></div><div className="quality-document-options">{documentOptions.map((item) => <label key={item} className={brief.documents.includes(item) ? "is-selected" : ""}><input type="checkbox" checked={brief.documents.includes(item)} onChange={() => toggle("documents", item)} /><span>{brief.documents.includes(item) ? <CheckCircle2 aria-hidden="true" /> : <FileText aria-hidden="true" />}</span><strong>{item}</strong><small>{brief.documents.includes(item) ? "Added to brief" : "Select if required"}</small></label>)}</div></section>

            <section id="builder-sample" className="quality-builder-card"><div className="quality-builder-card-title"><span>05</span><div><h3>Add a sample request</h3><p>Sample availability, cost, testing and courier arrangements require confirmation.</p></div><Send aria-hidden="true" /></div><label className="quality-sample-toggle"><input type="checkbox" checked={brief.sampleRequested} onChange={(event) => update("sampleRequested", event.target.checked)} /><span><i /></span><strong>Include a sample request with this quality brief</strong></label>{brief.sampleRequested && <div className="quality-builder-grid quality-sample-fields"><label>Sample quantity<input value={brief.sampleQuantity} onChange={(event) => update("sampleQuantity", event.target.value)} placeholder="e.g. 2 kg" /></label><label>Courier destination<input value={brief.courierDestination} onChange={(event) => update("courierDestination", event.target.value)} placeholder="City and country" /></label><label>Required date<input type="date" value={brief.targetDate} onChange={(event) => update("targetDate", event.target.value)} /></label></div>}<label className="quality-builder-notes">Additional quality notes<textarea rows={4} value={brief.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Acceptance tolerances, inspection agency preference, photographic evidence or special handling…" /></label></section>

            <div className="quality-builder-actions"><span><Save aria-hidden="true" /> {saved ? "Saved" : "Draft auto-saves"}</span><div><button type="button" className="quality-reset" onClick={() => { setBrief(defaultBrief); window.localStorage.removeItem(QUALITY_BRIEF_KEY); }}><RotateCcw aria-hidden="true" /> Reset</button><button type="button" className="quality-print" onClick={() => { saveNow(); window.print(); }}><Printer aria-hidden="true" /> Print / save PDF</button><button type="button" className="btn-accent" onClick={continueToQuote}>Continue to quote <ArrowRight aria-hidden="true" /></button></div></div>
          </div>
        </div>

        <div className="quality-template-library" aria-labelledby="quality-templates-title"><div><span>Reusable templates</span><h3 id="quality-templates-title">Download and complete offline</h3><p>Blank CSV templates provide a structured starting point and do not represent completed reports or certificates.</p></div><div>{templates.map(({ icon: Icon, title, text, href }) => <article key={title}><Icon aria-hidden="true" /><h4>{title}</h4><p>{text}</p><a href={href} download>Download template <Download aria-hidden="true" /></a></article>)}</div></div>

        {selectedProduct && <div className="quality-print-summary"><h1>Quality requirement brief</h1><p>{formatQualityBrief(brief, selectedProduct.name)}</p><small>Prepared from the Leo Infinity website. This buyer brief is subject to supplier, inspection, document and quotation confirmation.</small></div>}
      </div>
    </section>
  );
}
