/* eslint-disable prettier/prettier */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ClipboardCheck, Container, Expand, FlaskConical, Minus, PackageCheck, Plus, ScanSearch, TestTubeDiagonal } from "lucide-react";
import macroRice from "@/assets/catalog-basmati-rice-1.jpg";
import macroPepper from "@/assets/catalog-black-pepper-2.jpg";
import macroMango from "@/assets/catalog-alphonso-mango-1.jpg";
import bulkPulses from "@/assets/gal-pulses-bulk.jpg";
import sortedPulses from "@/assets/gal-pulses-sorting.jpg";
import inspectionImage from "@/assets/qual-inspection.jpg";
import samplingImage from "@/assets/qual-sampling.jpg";
import { SmartImage } from "@/components/smart-image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import "@/quality-visual-experience.css";

const macroImages = [
  { image: macroRice, title: "Grain profile", detail: "Review length, uniformity, broken percentage and visual condition against the agreed rice specification." },
  { image: macroPepper, title: "Surface and colour", detail: "Use close visual review to record appearance, foreign matter and other buyer-defined physical criteria." },
  { image: macroMango, title: "Maturity and condition", detail: "Capture colour, skin condition, size and maturity observations for a fresh-produce brief." },
  { image: samplingImage, title: "Sample handling", detail: "Record the sample source, lot reference, method, date and requested evaluation before testing." },
] as const;

const annotations = [
  { label: "Product identity", text: "Match the sample and lot reference to the order brief.", x: "24%", y: "30%" },
  { label: "Visual condition", text: "Record colour, uniformity, damage and foreign matter as applicable.", x: "58%", y: "40%" },
  { label: "Measurement", text: "Capture weight, size, count or other agreed physical parameters.", x: "72%", y: "68%" },
  { label: "Evidence record", text: "Keep dated photographs and results linked to the inspection reference.", x: "35%", y: "74%" },
] as const;

const illustrations = [
  { icon: ScanSearch, step: "01", title: "Sampling", text: "Define lot, method, quantity and seal references." },
  { icon: TestTubeDiagonal, step: "02", title: "Testing", text: "Confirm parameters, limits, method and reporting unit." },
  { icon: PackageCheck, step: "03", title: "Packing", text: "Check material, net weight, marks, labels and integrity." },
  { icon: Container, step: "04", title: "Loading", text: "Record quantity, container condition and loading evidence." },
] as const;

const comparisonRows = [
  ["Identity", "Product, variety and origin", "Lot code and supplier reference"],
  ["Physical", "Size, count, colour and condition", "Buyer tolerance and sampling method"],
  ["Analytical", "Selected parameters when requested", "Method, limit, unit and laboratory scope"],
  ["Packing", "Format, weight and marks", "Artwork, material and acceptance sample"],
  ["Release", "Order-linked document review", "Named approver and acceptance evidence"],
] as const;

function StageCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 700);
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  return <span ref={ref}>{shown}{suffix}</span>;
}

export function QualityVisualExperience() {
  const [comparePosition, setComparePosition] = useState(52);
  const [activeAnnotation, setActiveAnnotation] = useState(0);
  const [macroZoom, setMacroZoom] = useState(1);

  return (
    <section className="quality-visual" aria-labelledby="quality-visual-title">
      <div className="quality-shell">
        <div className="quality-heading">
          <div><span>See the checkpoints</span><h2 id="quality-visual-title">A closer view of product acceptance</h2></div>
          <p>Macro views, annotated inspection points and structured comparisons help buyers turn visual expectations into an agreed brief.</p>
        </div>

        <div className="quality-visual-stats" aria-label="Quality workflow overview">
          <article><StageCounter value={5} /><p>order checkpoints</p></article>
          <article><StageCounter value={4} /><p>testing families</p></article>
          <article><StageCounter value={8} /><p>document types mapped</p></article>
          <article><StageCounter value={1} suffix=" brief" /><p>carried into the quote</p></article>
        </div>

        <div className="quality-macro-grid">
          {macroImages.map((item, index) => <Dialog key={item.title} onOpenChange={(open) => { if (!open) setMacroZoom(1); }}>
            <DialogTrigger asChild>
              <button type="button" className={`quality-macro-card quality-macro-card-${index + 1}`}>
                <SmartImage src={item.image} alt={`${item.title} representative macro view`} width={800} height={650} className="h-full w-full object-cover" />
                <span className="quality-media-label">Representative imagery</span>
                <span className="quality-macro-copy"><small>0{index + 1}</small><strong>{item.title}</strong><em><Expand aria-hidden="true" /> Zoom</em></span>
              </button>
            </DialogTrigger>
            <DialogContent className="quality-gallery-dialog max-w-5xl!">
              <DialogHeader><DialogTitle>{item.title}</DialogTitle><DialogDescription>{item.detail} Representative image.</DialogDescription></DialogHeader>
              <div className="quality-zoom-controls" role="group" aria-label="Image zoom controls"><button type="button" onClick={() => setMacroZoom((value) => Math.max(1, value - .5))} disabled={macroZoom === 1}><Minus aria-hidden="true" /> Zoom out</button><span>{macroZoom.toFixed(1)}×</span><button type="button" onClick={() => setMacroZoom((value) => Math.min(2, value + .5))} disabled={macroZoom === 2}><Plus aria-hidden="true" /> Zoom in</button></div>
              <div className="quality-zoom-stage"><SmartImage src={item.image} alt={`${item.title} representative view`} width={1600} height={1100} style={{ transform: `scale(${macroZoom})` }} className="max-h-[68vh] w-full object-contain" /></div>
            </DialogContent>
          </Dialog>)}
        </div>

        <div className="quality-compare-layout">
          <div className="quality-compare-copy">
            <span>Illustrative grading comparison</span>
            <h3>Show the difference the specification must describe</h3>
            <p>Drag the control to compare an incoming bulk-product view with a sorting-stage view. Actual acceptance depends on a representative sample and written tolerances.</p>
            <label htmlFor="grading-position">Comparison position <strong>{comparePosition}%</strong></label>
            <input id="grading-position" type="range" min="10" max="90" value={comparePosition} onChange={(event) => setComparePosition(Number(event.target.value))} />
          </div>
          <div className="quality-before-after" style={{ "--compare": `${comparePosition}%` } as CSSProperties}>
            <SmartImage src={sortedPulses} alt="Representative sorted pulse product" width={1100} height={800} className="quality-after h-full w-full object-cover" />
            <div className="quality-before"><SmartImage src={bulkPulses} alt="Representative incoming bulk pulse product" width={1100} height={800} className="h-full w-full object-cover" /></div>
            <span className="quality-before-label">Incoming view</span><span className="quality-after-label">Sorting stage</span><i aria-hidden="true" />
          </div>
        </div>

        <div className="quality-annotation-layout">
          <div className="quality-annotated-photo">
            <SmartImage src={inspectionImage} alt="Representative inspection with interactive annotation points" width={1200} height={950} className="h-full w-full object-cover" />
            <span className="quality-media-label">Illustrative inspection example</span>
            {annotations.map((item, index) => <button key={item.label} type="button" style={{ left: item.x, top: item.y }} aria-label={`Show annotation: ${item.label}`} aria-pressed={activeAnnotation === index} onClick={() => setActiveAnnotation(index)}><span>{index + 1}</span></button>)}
          </div>
          <div className="quality-annotation-panel">
            <span>Annotated inspection</span>
            <h3>Record the evidence behind each checkpoint</h3>
            <ol>{annotations.map((item, index) => <li key={item.label} className={activeAnnotation === index ? "is-active" : ""}><button type="button" onClick={() => setActiveAnnotation(index)}><span>0{index + 1}</span><div><strong>{item.label}</strong><p>{item.text}</p></div></button></li>)}</ol>
          </div>
        </div>

        <div className="quality-illustrations" aria-labelledby="quality-technical-title">
          <div className="quality-illustration-heading"><span>Technical path</span><h3 id="quality-technical-title">Four handoffs, one linked record</h3></div>
          <div className="quality-illustration-track" aria-hidden="true"><i /><i /><i /></div>
          <div className="quality-illustration-grid">{illustrations.map(({ icon: Icon, step, title, text }) => <article key={title}><span>{step}</span><div><Icon aria-hidden="true" /></div><h4>{title}</h4><p>{text}</p></article>)}</div>
        </div>

        <div className="quality-comparison-table-wrap">
          <div><span>Technical comparison</span><h3>From a standard review to buyer-specific acceptance</h3><p>Use this table to decide which details belong in the quality brief before a quotation is confirmed.</p></div>
          <div className="quality-comparison-scroll" tabIndex={0} aria-label="Technical quality review comparison table">
            <table><thead><tr><th>Review area</th><th>Standard starting point</th><th>Buyer-specific addition</th></tr></thead><tbody>{comparisonRows.map(([area, standard, buyer]) => <tr key={area}><th scope="row">{area}</th><td><ClipboardCheck aria-hidden="true" />{standard}</td><td><FlaskConical aria-hidden="true" />{buyer}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
    </section>
  );
}
