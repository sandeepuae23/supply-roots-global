/* eslint-disable prettier/prettier */
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, Mail, MessageCircle, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { products } from "@/data/catalog";
import { submitQuote, type QuoteSubmissionResult } from "@/lib/quote.server";
import "@/quote-wizard.css";

type ProductRow = { id: string; product: string; specification: string; quantity: string; unit: string };
type Draft = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  products: ProductRow[];
  origin: string;
  destinationCountry: string;
  destinationPort: string;
  packaging: string;
  incoterm: string;
  deliveryDate: string;
  contactMethod: string;
  notes: string;
};

const DRAFT_KEY = "leo-infinity-quote-draft-v1";
const emptyDraft: Draft = {
  company: "", contactName: "", email: "", phone: "", products: [], origin: "",
  destinationCountry: "", destinationPort: "", packaging: "", incoterm: "CIF",
  deliveryDate: "", contactMethod: "WhatsApp", notes: "",
};

function row(product = ""): ProductRow {
  return { id: crypto.randomUUID(), product, specification: "", quantity: "", unit: "MT" };
}

export function QuoteWizard({ initialProducts = [] }: { initialProducts?: string[] }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft, products: initialProducts.length ? initialProducts.map(row) : [row()] }));
  const [files, setFiles] = useState<File[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<QuoteSubmissionResult | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Draft;
        setDraft((current) => ({ ...emptyDraft, ...parsed, products: initialProducts.length ? initialProducts.map(row) : parsed.products?.length ? parsed.products : current.products }));
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
    setHydrated(true);
  }, [initialProducts]);

  useEffect(() => {
    if (!hydrated || result) return;
    const timer = window.setTimeout(() => window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)), 350);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated, result]);

  const selectedNames = useMemo(() => draft.products.map((item) => products.find((product) => product.slug === item.product)?.name ?? item.product).filter(Boolean), [draft.products]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function updateProduct(id: string, key: keyof Omit<ProductRow, "id">, value: string) {
    update("products", draft.products.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  function canContinue() {
    if (step === 0 && (!draft.company || !draft.contactName || !draft.email || !draft.phone)) {
      setMessage("Complete your company and contact details to continue."); return false;
    }
    if (step === 1 && !draft.products.some((item) => item.product && item.quantity && item.unit)) {
      setMessage("Add at least one product with a quantity and unit."); return false;
    }
    if (step === 2 && (!draft.destinationCountry || !draft.incoterm || !draft.contactMethod)) {
      setMessage("Add the destination, quote basis and preferred contact method."); return false;
    }
    return true;
  }

  async function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue()) return;
    setBusy(true); setMessage("");
    const form = new FormData();
    Object.entries(draft).forEach(([key, val]) => {
      if (key !== "products") form.set(key, String(val));
    });
    form.set("products", JSON.stringify(draft.products.map((item) => ({ ...item, product: products.find((product) => product.slug === item.product)?.name ?? item.product }))));
    form.set("startedAt", String(startedAt));
    form.set("website", "");
    files.forEach((file) => form.append("files", file, file.name));
    try {
      const response = await submitQuote({ data: form });
      if (!response.ok) {
        setMessage(response.message); setBusy(false); return;
      }
      window.localStorage.removeItem(DRAFT_KEY);
      setResult(response);
    } catch {
      setMessage("The request could not be prepared. Please try again or contact the trade desk directly.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="quote-confirmation" aria-live="polite">
        <CheckCircle2 aria-hidden="true" />
        <span>{result.delivered ? "Enquiry delivered" : "Enquiry prepared"}</span>
        <h2>Your reference is {result.reference}</h2>
        <p>{result.message}</p>
        <div>
          {result.whatsappUrl && <a href={result.whatsappUrl} target="_blank" rel="noreferrer" className="btn-accent"><MessageCircle aria-hidden="true" /> Send by WhatsApp</a>}
          {result.emailUrl && <a href={result.emailUrl} className="btn-outline"><Mail aria-hidden="true" /> Send by email</a>}
        </div>
        <small>Keep this reference for follow-up. The trade desk normally responds within one business day after receiving the enquiry.</small>
      </section>
    );
  }

  const steps = ["Company", "Products", "Delivery", "Review"];
  return (
    <form className="quote-wizard" onSubmit={finish} noValidate>
      <ol className="quote-steps" aria-label="Quote request progress">
        {steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-complete" : ""}><span>{index < step ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span><strong>{label}</strong></li>)}
      </ol>

      <div className="quote-form-card">
        {step === 0 && <fieldset><legend>Tell us who we are quoting</legend><p>Business contact details help the trade desk prepare the right commercial terms.</p><div className="quote-grid"><label>Company name<input value={draft.company} onChange={(e) => update("company", e.target.value)} autoComplete="organization" required /></label><label>Contact person<input value={draft.contactName} onChange={(e) => update("contactName", e.target.value)} autoComplete="name" required /></label><label>Business email<input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /></label><label>Phone / WhatsApp<input type="tel" value={draft.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" required /></label></div></fieldset>}

        {step === 1 && <fieldset><legend>Build your product request</legend><p>Select several products and set a quantity for each line.</p><div className="quote-product-list">{draft.products.map((item, index) => <div className="quote-product-row" key={item.id}><span className="quote-row-number">{index + 1}</span><label>Product<select value={item.product} onChange={(e) => updateProduct(item.id, "product", e.target.value)} required><option value="">Select product</option>{products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}<option value="Other product">Other / custom product</option></select></label><label>Grade or specification<input value={item.specification} onChange={(e) => updateProduct(item.id, "specification", e.target.value)} placeholder="Variety, grade, size…" /></label><label>Quantity<input inputMode="decimal" value={item.quantity} onChange={(e) => updateProduct(item.id, "quantity", e.target.value)} placeholder="e.g. 20" required /></label><label>Unit<select value={item.unit} onChange={(e) => updateProduct(item.id, "unit", e.target.value)}><option>kg</option><option>MT</option><option>pallets</option><option>20' container</option><option>40' container</option></select></label>{draft.products.length > 1 && <button type="button" aria-label={`Remove product ${index + 1}`} onClick={() => update("products", draft.products.filter((rowItem) => rowItem.id !== item.id))}><Trash2 aria-hidden="true" /></button>}</div>)}</div><button className="quote-add-product" type="button" onClick={() => update("products", [...draft.products, row()])}><Plus aria-hidden="true" /> Add another product</button></fieldset>}

        {step === 2 && <fieldset><legend>Delivery and commercial terms</legend><p>These details help us compare sea, air and land options for your destination.</p><div className="quote-grid"><label>Preferred country of origin<input value={draft.origin} onChange={(e) => update("origin", e.target.value)} placeholder="Optional" /></label><label>Destination country<input value={draft.destinationCountry} onChange={(e) => update("destinationCountry", e.target.value)} required /></label><label>Destination port<input value={draft.destinationPort} onChange={(e) => update("destinationPort", e.target.value)} placeholder="e.g. Jebel Ali" /></label><label>Preferred delivery date<input type="date" value={draft.deliveryDate} onChange={(e) => update("deliveryDate", e.target.value)} /></label><label>Packaging requirement<input value={draft.packaging} onChange={(e) => update("packaging", e.target.value)} placeholder="Bulk, retail or private label" /></label><label>Quote basis<select value={draft.incoterm} onChange={(e) => update("incoterm", e.target.value)}><option>FOB</option><option>CFR</option><option>CIF</option></select></label><label>Preferred contact<select value={draft.contactMethod} onChange={(e) => update("contactMethod", e.target.value)}><option>WhatsApp</option><option>Email</option><option>Phone call</option></select></label><label className="quote-file-field"><span>Specification or reference files</span><span className="quote-file-control"><FileUp aria-hidden="true" />{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "PDF or image · up to 3 files"}<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" multiple onChange={(e) => { const next = Array.from(e.target.files ?? []).slice(0, 3); if (next.some((file) => file.size > 5 * 1024 * 1024)) { setMessage("Each file must be 5 MB or smaller."); return; } setFiles(next); }} /></span></label><label className="quote-notes">Additional requirements<textarea rows={5} value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Certificates, labeling, inspection or target pricing…" /></label></div></fieldset>}

        {step === 3 && <fieldset><legend>Review your request</legend><p>Check the essentials before creating your reference.</p><div className="quote-review"><div><span>Buyer</span><strong>{draft.company}</strong><p>{draft.contactName} · {draft.email}<br />{draft.phone}</p></div><div><span>Products</span><strong>{selectedNames.join(", ")}</strong><p>{draft.products.map((item) => `${item.quantity} ${item.unit}`).join(" · ")}</p></div><div><span>Delivery</span><strong>{draft.destinationPort || draft.destinationCountry}</strong><p>{draft.destinationCountry} · {draft.incoterm}{draft.deliveryDate ? ` · ${draft.deliveryDate}` : ""}</p></div><div><span>Contact</span><strong>{draft.contactMethod}</strong><p>{files.length ? `${files.length} reference file${files.length > 1 ? "s" : ""} attached` : "No reference files attached"}</p></div></div><div className="quote-response-note"><CheckCircle2 aria-hidden="true" /><div><strong>Clear follow-up</strong><p>You will receive a unique enquiry reference. When delivery is configured, the trade desk normally responds within one business day.</p></div></div></fieldset>}

        <label className="quote-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" name="website" /></label>
        {message && <p className="quote-message" role="alert">{message}</p>}
        <div className="quote-navigation">
          <span><Save aria-hidden="true" /> Draft saved on this device</span>
          <div>{step > 0 && <button type="button" className="btn-outline" onClick={() => { setStep((current) => current - 1); setMessage(""); }}><ArrowLeft aria-hidden="true" /> Back</button>}{step < 3 ? <button type="button" className="btn-accent" onClick={() => { if (canContinue()) { setStep((current) => current + 1); setMessage(""); } }}>Continue <ArrowRight aria-hidden="true" /></button> : <button type="submit" className="btn-accent" disabled={busy}>{busy ? "Preparing…" : "Submit quote request"} <ArrowRight aria-hidden="true" /></button>}</div>
        </div>
      </div>
    </form>
  );
}
