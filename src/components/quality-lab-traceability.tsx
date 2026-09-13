/* eslint-disable prettier/prettier */
import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  Factory,
  FileCheck2,
  FlaskConical,
  Gauge,
  Leaf,
  MapPin,
  Microscope,
  PackageCheck,
  Route,
  ShieldCheck,
  Snowflake,
  Sprout,
  TestTube2,
  Thermometer,
  Truck,
  Wheat,
} from "lucide-react";
import { useMemo, useState } from "react";
import { QUALITY_BRIEF_KEY, type QualityBrief } from "@/lib/quality-brief";
import "@/quality-lab-traceability.css";

type TestCategory = "chemical" | "physical" | "microbiological" | "residue";
type ProductFamily = "grains" | "fresh" | "nuts" | "frozen";
type SamplingScope = "batch" | "lot" | "shipment";

const testCategories = {
  chemical: {
    icon: Beaker,
    label: "Chemical",
    summary: "Composition, contaminants or other chemistry-based parameters selected for the product and market.",
    timing: "Method dependent",
  },
  physical: {
    icon: Gauge,
    label: "Physical",
    summary: "Identity, dimensions, condition and defect checks measured against an agreed sampling plan.",
    timing: "Often available before complex instrumental work",
  },
  microbiological: {
    icon: Microscope,
    label: "Microbiological",
    summary: "Buyer- or destination-requested organism and hygiene indicators using an agreed laboratory method.",
    timing: "Incubation and confirmation steps affect timing",
  },
  residue: {
    icon: TestTube2,
    label: "Residue analysis",
    summary: "Targeted or multi-residue screening selected for the commodity, origin and destination.",
    timing: "Panel size and confirmatory analysis affect timing",
  },
} as const;

const productFamilies: Record<ProductFamily, { label: string; icon: typeof Wheat; note: string; parameters: Record<TestCategory, string[]> }> = {
  grains: {
    label: "Grains & pulses",
    icon: Wheat,
    note: "Parameters depend on commodity, grade, origin, storage history and destination.",
    parameters: {
      chemical: ["Moisture", "Protein or composition", "Mycotoxin panel when requested"],
      physical: ["Purity / foreign matter", "Broken or damaged units", "Size, count or test weight"],
      microbiological: ["Total count", "Yeast and mould", "Specified pathogens when required"],
      residue: ["Pesticide residue panel", "Fumigant residues when applicable", "Buyer-nominated compounds"],
    },
  },
  fresh: {
    label: "Fresh produce",
    icon: Sprout,
    note: "Variety, maturity, route duration and destination rules shape the final inspection and test plan.",
    parameters: {
      chemical: ["Soluble solids when relevant", "Acidity when relevant", "Buyer-requested contaminants"],
      physical: ["Size / count", "Maturity and colour", "Defects, damage and decay"],
      microbiological: ["Hygiene indicators", "Yeast and mould", "Specified pathogens when required"],
      residue: ["Pesticide residue panel", "Buyer-nominated compounds", "Destination-specific screen after confirmation"],
    },
  },
  nuts: {
    label: "Nuts, seeds & dried fruit",
    icon: Leaf,
    note: "The product form, processing method, moisture sensitivity and intended use affect the scope.",
    parameters: {
      chemical: ["Moisture / water activity", "Oil or composition when relevant", "Mycotoxin panel when requested"],
      physical: ["Count / size", "Foreign matter", "Defects and damage"],
      microbiological: ["Total count", "Yeast and mould", "Specified pathogens when required"],
      residue: ["Pesticide residue panel", "Processing residues when applicable", "Buyer-nominated compounds"],
    },
  },
  frozen: {
    label: "Frozen products",
    icon: Snowflake,
    note: "Product format, processing, pack integrity and continuous temperature control all affect acceptance.",
    parameters: {
      chemical: ["Composition when relevant", "Buyer-requested contaminants", "Additive checks when applicable"],
      physical: ["Piece size / cut", "Defects and foreign matter", "Pack weight and condition"],
      microbiological: ["Hygiene indicators", "Specified pathogens when required", "Buyer-defined organism panel"],
      residue: ["Pesticide or veterinary panel as relevant", "Buyer-nominated compounds", "Destination-specific screen after confirmation"],
    },
  },
};

const scopeCopy: Record<SamplingScope, { title: string; text: string }> = {
  batch: { title: "Batch", text: "A defined production run made under substantially consistent conditions." },
  lot: { title: "Lot", text: "A traceable quantity grouped under one identification code for control and release." },
  shipment: { title: "Shipment", text: "The dispatched consignment; it may contain one or several separately identified lots." },
};

const traceStages = [
  { icon: Sprout, title: "Origin", record: "Supplier, country, source reference and harvest or production date where applicable.", evidence: "Source record" },
  { icon: Factory, title: "Production", record: "Production or handling date, batch code, process record and responsible facility.", evidence: "Batch record" },
  { icon: PackageCheck, title: "Packing", record: "Pack date, lot code, packaging format, label version and quantity reconciliation.", evidence: "Packing record" },
  { icon: Truck, title: "Shipment", record: "Container or vehicle reference, seal, loading evidence, transport document and logger ID.", evidence: "Shipment record" },
  { icon: MapPin, title: "Destination", record: "Receipt date, condition check, quantity received and any exception or release decision.", evidence: "Receipt record" },
] as const;

const coldChainStages = [
  { title: "Pre-cooling / freezing", text: "Record product temperature and process completion before packing where applicable." },
  { title: "Cold storage", text: "Match the agreed storage set-point and record any defined checks or alarms." },
  { title: "Loading", text: "Record vehicle or container condition, set-point, product temperature and logger placement." },
  { title: "In transit", text: "Use the agreed monitoring device and review excursion data against the acceptance plan." },
  { title: "Arrival", text: "Capture seal, logger data, product condition and receipt temperature before disposition." },
] as const;

const temperatureGuides = [
  { product: "Apples", state: "Fresh / chilled", range: "0 to 4 °C", note: "Variety, atmosphere and route can change the set-point." },
  { product: "Table grapes", state: "Fresh / chilled", range: "0 to 1 °C", note: "Packing and humidity planning remain important." },
  { product: "Mangoes", state: "Fresh / chilled", range: "10 to 13 °C", note: "Variety and maturity must be considered." },
  { product: "Bananas", state: "Fresh / chilled", range: "13 to 14 °C", note: "Maturity and ripening program can change handling." },
  { product: "Frozen foods", state: "Frozen", range: "−18 °C or colder", note: "Product specification and applicable rules take priority." },
] as const;

const recallSteps = [
  ["01", "Contain", "Hold affected stock and stop further dispatch against the identified code."],
  ["02", "Trace", "Link supplier, batch, packing, shipment and customer records to define the affected scope."],
  ["03", "Notify", "Escalate through the agreed buyer, supplier, carrier and authority contacts as applicable."],
  ["04", "Resolve", "Document disposition, corrective action, evidence and formal closure."],
] as const;

function csvDownload(parameters: string[], limits: Record<string, string>, family: string, scope: string) {
  const rows = [
    ["Product family", family],
    ["Sampling scope", scope],
    [],
    ["Parameter", "Buyer limit / standard reference", "Method", "Result", "Decision"],
    ...parameters.map((parameter) => [parameter, limits[parameter] ?? "", "", "", ""]),
  ];
  const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function sampleReportDownload(parameters: string[]) {
  const rows = [
    ["ILLUSTRATIVE LABORATORY REPORT TEMPLATE — NOT A TEST RESULT"],
    ["Laboratory name", "Add only after verification"],
    ["Accreditation and scope", "Add only after verification"],
    ["Report reference", ""],
    ["Sample / lot ID", ""],
    ["Sample receipt date", ""],
    ["Report issue date", ""],
    [],
    ["Parameter", "Method", "Unit", "Result", "Confirmed limit", "Decision"],
    ...parameters.map((parameter) => [parameter, "", "", "", "", ""]),
    [],
    ["Authorised signatory", ""],
    ["Report verification link or code", ""],
  ];
  const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

export function QualityLabTraceability() {
  const [testCategory, setTestCategory] = useState<TestCategory>("physical");
  const [productFamily, setProductFamily] = useState<ProductFamily>("grains");
  const [samplingScope, setSamplingScope] = useState<SamplingScope>("lot");
  const [customLimits, setCustomLimits] = useState<Record<string, string>>({});
  const [traceStage, setTraceStage] = useState(0);
  const [coldStage, setColdStage] = useState(0);
  const [origin, setOrigin] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const family = productFamilies[productFamily];
  const category = testCategories[testCategory];
  const parameters = family.parameters[testCategory];
  const customCount = useMemo(() => Object.values(customLimits).filter((value) => value.trim()).length, [customLimits]);
  const csvHref = csvDownload(parameters, customLimits, family.label, scopeCopy[samplingScope].title);
  const sampleReportHref = sampleReportDownload(parameters);
  const ActiveTraceIcon = traceStages[traceStage]!.icon;

  function appendToQualityBrief(note: string, tests: string[] = []) {
    const emptyBrief: QualityBrief = { version: 1, category: "", product: "", grade: "", variety: "", sizeCount: "", moisture: "", purity: "", temperature: "", packaging: "", inspectionStages: [], tests: [], documents: [], sampleRequested: false, sampleQuantity: "", courierDestination: "", targetDate: "", notes: "" };
    let brief = emptyBrief;
    try {
      const stored = window.localStorage.getItem(QUALITY_BRIEF_KEY);
      if (stored) brief = { ...emptyBrief, ...(JSON.parse(stored) as Partial<QualityBrief>) };
    } catch {
      // Continue with a clean brief when an older draft cannot be read.
    }
    brief.tests = Array.from(new Set([...brief.tests, ...tests]));
    brief.notes = [brief.notes, note].filter(Boolean).join("\n\n");
    brief.savedAt = new Date().toISOString();
    window.localStorage.setItem(QUALITY_BRIEF_KEY, JSON.stringify(brief));
    setSaveMessage("Added to quality brief");
    window.setTimeout(() => setSaveMessage(""), 1800);
  }

  function saveTestPlan() {
    const limits = parameters.map((parameter) => `${parameter}: ${customLimits[parameter]?.trim() || "limit to confirm"}`).join("; ");
    appendToQualityBrief(`Laboratory test plan — ${family.label}; ${category.label}; scope: ${scopeCopy[samplingScope].title}. ${limits}`, parameters);
  }

  function saveTraceFields() {
    appendToQualityBrief(`Traceability fields — origin: ${origin || "to confirm"}; supplier/source reference: ${sourceReference || "to confirm"}; harvest/production/processing date: ${harvestDate || "as applicable"}.`);
  }

  return (
    <div className="qlt-experience">
      <section className="qlt-laboratory" aria-labelledby="qlt-lab-title">
        <div className="quality-shell">
          <header className="qlt-section-heading">
            <div>
              <span><FlaskConical aria-hidden="true" /> Laboratory test planner</span>
              <h2 id="qlt-lab-title">Define the test scope before a sample is submitted.</h2>
            </div>
            <p>Use this planner to prepare a buyer brief. The laboratory, method, accreditation scope, limits, price and committed turnaround require written confirmation for the order.</p>
          </header>

          <div className="qlt-family-tabs" role="tablist" aria-label="Product family">
            {Object.entries(productFamilies).map(([key, item]) => {
              const Icon = item.icon;
              return <button key={key} type="button" role="tab" aria-selected={productFamily === key} onClick={() => setProductFamily(key as ProductFamily)}><Icon aria-hidden="true" /><span>{item.label}</span></button>;
            })}
          </div>

          <div className="qlt-lab-layout">
            <aside className="qlt-test-categories" aria-label="Test category">
              <span>01 / Select analysis</span>
              {Object.entries(testCategories).map(([key, item]) => {
                const Icon = item.icon;
                const active = testCategory === key;
                return <button key={key} type="button" className={active ? "is-active" : ""} aria-pressed={active} onClick={() => setTestCategory(key as TestCategory)}><Icon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.timing}</small></span><ArrowRight aria-hidden="true" /></button>;
              })}
            </aside>

            <div className="qlt-test-panel">
              <div className="qlt-test-panel-head"><div><span>{category.label} testing</span><h3>Common parameters for {family.label.toLowerCase()}</h3><p>{category.summary} {family.note}</p></div><div><strong>{parameters.length}</strong><small>planning prompts</small></div></div>
              <div className="qlt-scope-selector">
                <span>02 / Apply testing to</span>
                <div role="group" aria-label="Sampling and testing scope">
                  {(Object.keys(scopeCopy) as SamplingScope[]).map((scope) => <button key={scope} type="button" className={samplingScope === scope ? "is-active" : ""} aria-pressed={samplingScope === scope} onClick={() => setSamplingScope(scope)}>{scopeCopy[scope].title}</button>)}
                </div>
                <p><strong>{scopeCopy[samplingScope].title}:</strong> {scopeCopy[samplingScope].text} Sampling quantity, selection method and representativeness must be agreed.</p>
              </div>
              <div className="qlt-parameter-table-wrap">
                <table className="qlt-parameter-table">
                  <caption>Enter a buyer limit, tolerance or standard reference only where required.</caption>
                  <thead><tr><th>Parameter</th><th>Planning status</th><th>Buyer limit / reference</th></tr></thead>
                  <tbody>{parameters.map((parameter) => <tr key={parameter}><th scope="row">{parameter}</th><td><span className={customLimits[parameter]?.trim() ? "is-defined" : ""}>{customLimits[parameter]?.trim() ? <Check aria-hidden="true" /> : null}{customLimits[parameter]?.trim() ? "Buyer-defined" : "To confirm"}</span></td><td><input value={customLimits[parameter] ?? ""} onChange={(event) => setCustomLimits((current) => ({ ...current, [parameter]: event.target.value }))} aria-label={`Buyer limit or reference for ${parameter}`} placeholder="e.g. limit + unit or reference" /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="qlt-test-actions"><p><CheckCircle2 aria-hidden="true" /><span><strong>{saveMessage || `${customCount} custom requirement${customCount === 1 ? "" : "s"}`}</strong> {saveMessage ? "" : "entered across this planner."}</span></p><div><button type="button" onClick={saveTestPlan}><ClipboardList aria-hidden="true" /> Add to quality brief</button><a href={sampleReportHref} download="illustrative-laboratory-report-template.csv"><Download aria-hidden="true" /> Sample report template</a><a href={csvHref} download="buyer-laboratory-test-brief.csv"><Download aria-hidden="true" /> Download test brief</a></div></div>
            </div>
          </div>

          <div className="qlt-turnaround-note"><FileCheck2 aria-hidden="true" /><div><strong>How turnaround is confirmed</strong><p>Timing starts after the laboratory accepts the sample and final scope. Method, preparation, incubation, panel size, repeat or confirmatory work, laboratory capacity and reporting review can change the issue date. The quotation should state the committed turnaround.</p></div><span>No laboratory or accreditation is claimed on this planner.</span></div>

          <div className="qlt-comparison" aria-labelledby="qlt-comparison-title">
            <div><span>Standard or tailored</span><h3 id="qlt-comparison-title">Choose the right level of control</h3></div>
            <div className="qlt-comparison-table" role="table" aria-label="Standard and buyer-specific testing comparison">
              <div role="row" className="qlt-comparison-head"><span role="columnheader">Decision point</span><strong role="columnheader">Standard test plan</strong><strong role="columnheader">Buyer-specific plan</strong></div>
              {[
                ["Parameter list", "Proposed for the product", "Named by the buyer or destination brief"],
                ["Limits", "Applicable proposal, subject to confirmation", "Buyer limit, unit and reference recorded"],
                ["Method", "Laboratory proposal", "Named method or agreed equivalent"],
                ["Sampling", "Proposed batch or lot scope", "Buyer-defined batch, lot or shipment plan"],
                ["Release", "Review against confirmed criteria", "Buyer acceptance or release instruction recorded"],
              ].map(([label, standard, buyer]) => <div role="row" key={label}><span role="cell">{label}</span><p role="cell">{standard}</p><p role="cell">{buyer}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="qlt-traceability" aria-labelledby="qlt-trace-title">
        <div className="quality-shell">
          <header className="qlt-section-heading qlt-section-heading-light">
            <div><span><Route aria-hidden="true" /> Farm-to-destination traceability</span><h2 id="qlt-trace-title">One lot code connects the record trail.</h2></div>
            <p>A lot identifier links the supplier or source to production, packing, shipment and receipt records. Select a checkpoint to see the evidence that can be captured.</p>
          </header>

          <div className="qlt-trace-map">
            <div className="qlt-trace-path" role="tablist" aria-label="Traceability checkpoints">
              {traceStages.map(({ icon: Icon, title }, index) => <button key={title} type="button" role="tab" aria-selected={traceStage === index} onClick={() => setTraceStage(index)}><span>{traceStage > index ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span><strong>{title}</strong><small>0{index + 1}</small></button>)}
            </div>
            <article className="qlt-trace-detail" role="tabpanel"><ActiveTraceIcon aria-hidden="true" /><div><span>{traceStages[traceStage]!.evidence}</span><h3>{traceStages[traceStage]!.title} checkpoint</h3><p>{traceStages[traceStage]!.record}</p></div><strong>Linked by lot / batch ID</strong></article>
          </div>

          <div className="qlt-trace-grid">
            <form className="qlt-origin-card" onSubmit={(event) => event.preventDefault()}>
              <div className="qlt-card-heading"><MapPin aria-hidden="true" /><div><span>Origin passport</span><h3>Capture the source reference</h3></div></div>
              <p>Harvest date is useful for fresh and seasonal products; use a production or processing date when that is the more relevant identifier.</p>
              <label>Country or production origin<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Enter confirmed origin" /></label>
              <label>Supplier / source reference<input value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="Reference shown in trace records" /></label>
              <label>Harvest, production or processing date<input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} /></label>
              <div className="qlt-origin-preview"><span>Trace record preview</span><dl><div><dt>Origin</dt><dd>{origin || "To be confirmed"}</dd></div><div><dt>Source</dt><dd>{sourceReference || "To be confirmed"}</dd></div><div><dt>Date</dt><dd>{harvestDate || "As applicable"}</dd></div></dl><button type="button" onClick={saveTraceFields}><ClipboardList aria-hidden="true" /> Add trace fields to brief</button></div>
            </form>

            <div className="qlt-lot-card">
              <div className="qlt-card-heading"><Boxes aria-hidden="true" /><div><span>Identity hierarchy</span><h3>Batch, lot and shipment</h3></div></div>
              <ol>
                <li><span>Batch</span><p>Groups output from a defined production run or process window.</p></li>
                <li><span>Lot</span><p>Creates the traceable unit used for sampling, test results and release status.</p></li>
                <li><span>Shipment</span><p>Connects one or more released lots to packing, loading and transport records.</p></li>
              </ol>
              <p className="qlt-lot-note"><ShieldCheck aria-hidden="true" /> Code format, record owner, retention period and retrieval process should be confirmed with the supplier and order team.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="qlt-cold-chain" aria-labelledby="qlt-cold-title">
        <div className="quality-shell">
          <header className="qlt-section-heading">
            <div><span><Thermometer aria-hidden="true" /> Temperature monitoring</span><h2 id="qlt-cold-title">Plan every cold-chain handoff.</h2></div>
            <p>For fresh and frozen products, the brief can name the set-point, permitted tolerance, monitoring device, review responsibility and excursion decision.</p>
          </header>

          <div className="qlt-cold-layout">
            <div className="qlt-cold-checkpoints">
              {coldChainStages.map((stage, index) => <button key={stage.title} type="button" className={coldStage === index ? "is-active" : ""} aria-pressed={coldStage === index} onClick={() => setColdStage(index)}><span>0{index + 1}</span><div><strong>{stage.title}</strong>{coldStage === index && <p>{stage.text}</p>}</div><Thermometer aria-hidden="true" /></button>)}
            </div>
            <div className="qlt-monitor-card"><Snowflake aria-hidden="true" /><span>Monitoring brief</span><h3>{coldChainStages[coldStage]!.title}</h3><ul><li><CheckCircle2 aria-hidden="true" /> Agreed product and ambient readings</li><li><CheckCircle2 aria-hidden="true" /> Calibrated device details where required</li><li><CheckCircle2 aria-hidden="true" /> Timestamp, location and responsible party</li><li><CheckCircle2 aria-hidden="true" /> Alert threshold and excursion decision</li></ul><p>Device type, logger placement, reading frequency and data access must be agreed for the shipment.</p></div>
          </div>

          <div className="qlt-temperature-table-wrap">
            <div><span>Planning guide</span><h3>Indicative product temperature ranges</h3><p>These broad ranges are prompts for enquiry planning. They are not acceptance specifications or transport instructions.</p></div>
            <table className="qlt-temperature-table"><thead><tr><th>Product</th><th>Condition</th><th>Initial planning range</th><th>Confirmation point</th></tr></thead><tbody>{temperatureGuides.map((item) => <tr key={item.product}><th scope="row">{item.product}</th><td>{item.state}</td><td><strong>{item.range}</strong></td><td>{item.note}</td></tr>)}</tbody></table>
            <p className="qlt-temperature-sources">Planning references: <a href="https://www.ars.usda.gov/is/np/CommercialStorage/CommercialStorage.pdf" target="_blank" rel="noreferrer">USDA Commercial Storage Handbook</a> and <a href="https://www.fao.org/4/ae075e/ae075e21.htm" target="_blank" rel="noreferrer">FAO postharvest guidance</a>. Confirm the exact set-point for the variety, maturity, pack, route and contract.</p>
            <p className="qlt-temperature-warning"><AlertTriangle aria-hidden="true" /><span><strong>Confirm before use.</strong> Exact temperature, humidity, atmosphere, tolerance and excursion rules depend on product, variety, maturity, packaging, supplier guidance, carrier capability and applicable destination requirements.</span></p>
          </div>
        </div>
      </section>

      <section className="qlt-incident" aria-labelledby="qlt-incident-title">
        <div className="quality-shell qlt-incident-layout">
          <div><span><ClipboardList aria-hidden="true" /> Recall and incident readiness</span><h2 id="qlt-incident-title">Make the response path clear before it is needed.</h2><p>The confirmed procedure should identify decision owners, emergency contacts, notification duties, record access and disposition authority for the product and destination.</p></div>
          <ol>{recallSteps.map(([number, title, text]) => <li key={title}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
        </div>
      </section>
    </div>
  );
}
