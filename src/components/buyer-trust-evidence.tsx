/* eslint-disable prettier/prettier */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, CheckCircle2, ClipboardCopy, FileCheck2, FileLock2, ImageIcon, Landmark, Maximize2, MessageSquareQuote, SearchCheck, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import representativeInspection from "@/assets/qual-inspection.jpg";
import representativeLoading from "@/assets/trade-containers.jpg";
import { SmartImage } from "@/components/smart-image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QUALITY_BRIEF_KEY, type QualityBrief } from "@/lib/quality-brief";
import "@/buyer-trust-evidence.css";

type BuyerTrustEvidenceStatus = "verified" | "order-specific" | "representative" | "awaiting-source";

type BuyerTrustEvidenceRecord = {
  id: string;
  title: string;
  category: "photographs" | "reports" | "partners" | "testimonials" | "case-studies" | "certifications" | "policies";
  status: BuyerTrustEvidenceStatus;
  summary: string;
  issuer?: string;
  issueDate?: string;
  validUntil?: string;
  scope?: string;
  verificationMethod?: string;
  downloadUrl?: string;
  downloadLabel?: string;
};

const statusDetails: Record<BuyerTrustEvidenceStatus, { label: string; note: string }> = {
  verified: { label: "Verified", note: "Source, scope and date have been checked." },
  "order-specific": { label: "Confirmed per order", note: "Evidence depends on the selected supplier, product or shipment." },
  representative: { label: "Representative", note: "Illustrative context only; it is not evidence of a completed shipment." },
  "awaiting-source": { label: "Not published", note: "An approved, traceable source is required before publication." },
};

const buyerTrustEvidenceRecords: BuyerTrustEvidenceRecord[] = [
  {
    id: "inspection-photographs",
    title: "Inspection and shipment photographs",
    category: "photographs",
    status: "representative",
    summary: "The current site imagery explains possible checkpoints. Order-linked photographs can be requested in the agreed inspection scope.",
    scope: "Product, packing, marks and loading, when included",
  },
  {
    id: "redacted-inspection-report",
    title: "Redacted inspection report",
    category: "reports",
    status: "awaiting-source",
    summary: "No approved report is published. A redacted example can be added after its origin, consent and commercial redactions are confirmed.",
    verificationMethod: "Report number and issuing party",
  },
  {
    id: "laboratory-inspection-partners",
    title: "Laboratory and inspection partners",
    category: "partners",
    status: "order-specific",
    summary: "The laboratory or inspection company should be named only after the required test scope, location and availability are confirmed.",
    scope: "Buyer-selected parameters and inspection location",
    verificationMethod: "Accreditation and scope review before confirmation",
  },
  {
    id: "customer-quality-testimonials",
    title: "Customer quality testimonials",
    category: "testimonials",
    status: "awaiting-source",
    summary: "No customer quotation is shown without approved wording, attribution and permission to publish.",
    verificationMethod: "Written customer approval",
  },
  {
    id: "quality-resolution-case-studies",
    title: "Quality-resolution case studies",
    category: "case-studies",
    status: "awaiting-source",
    summary: "A completed case can be published after its timeline, actions and measurable outcome are supported by records.",
    verificationMethod: "Order records and approved outcome data",
  },
  {
    id: "supplier-facility-certifications",
    title: "Supplier or facility certifications",
    category: "certifications",
    status: "order-specific",
    summary: "Certification evidence varies by supplying facility. The certificate, issuing authority, dates and covered scope should match the proposed order.",
    scope: "Named supplier or facility for the proposed product",
    verificationMethod: "Certificate number, issuer, validity and scope",
  },
  {
    id: "quality-policy",
    title: "Company quality policy",
    category: "policies",
    status: "awaiting-source",
    summary: "A controlled, approved policy file is required before a public download can be offered.",
    verificationMethod: "Document owner, version and approval date",
  },
  {
    id: "food-safety-policy",
    title: "Food-safety document",
    category: "policies",
    status: "awaiting-source",
    summary: "No company food-safety document is published until its owner, version, scope and approval date are verified.",
    verificationMethod: "Document owner, version, scope and approval date",
  },
];

const categoryLabels: Record<BuyerTrustEvidenceRecord["category"], string> = {
  photographs: "Photographs",
  reports: "Reports",
  partners: "Partners",
  testimonials: "Testimonials",
  "case-studies": "Case studies",
  certifications: "Certifications",
  policies: "Policies",
};

const categoryIcons = {
  photographs: ImageIcon,
  reports: FileCheck2,
  partners: Landmark,
  testimonials: MessageSquareQuote,
  "case-studies": SearchCheck,
  certifications: Building2,
  policies: FileLock2,
} as const;

const representativeMedia = [
  {
    image: representativeInspection,
    title: "Product inspection context",
    description: "Representative imagery used to explain product and packing checks.",
  },
  {
    image: representativeLoading,
    title: "Shipment handoff context",
    description: "Representative imagery used to explain container and loading stages.",
  },
] as const;

type BuyerTrustEvidenceProps = {
  records?: BuyerTrustEvidenceRecord[];
};

export function BuyerTrustEvidence({ records = buyerTrustEvidenceRecords }: BuyerTrustEvidenceProps) {
  const [activeStatus, setActiveStatus] = useState<"all" | BuyerTrustEvidenceStatus>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const visibleRecords = useMemo(
    () => records.filter((record) => activeStatus === "all" || record.status === activeStatus),
    [activeStatus, records],
  );

  const requestedRecords = useMemo(
    () => records.filter((record) => selected.includes(record.id)),
    [records, selected],
  );

  const requestText = useMemo(() => {
    if (!requestedRecords.length) return "Select the evidence you want included with your enquiry.";
    return [
      "Evidence requested for review:",
      ...requestedRecords.map((record) => `• ${record.title} — ${statusDetails[record.status].label}`),
      "Please confirm availability, applicable scope, issuing party and validity for the proposed product and order.",
    ].join("\n");
  }, [requestedRecords]);

  function toggleRequest(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setCopyState("idle");
  }

  async function copyRequest() {
    if (!requestedRecords.length) return;
    try {
      await navigator.clipboard.writeText(requestText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function saveRequestForEnquiry() {
    if (typeof window === "undefined" || !requestedRecords.length) return;
    const stored = window.localStorage.getItem(QUALITY_BRIEF_KEY);
    let brief: QualityBrief = {
      version: 1,
      category: "",
      product: "",
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
    try {
      if (stored) brief = { ...brief, ...(JSON.parse(stored) as Partial<QualityBrief>) };
    } catch {
      // Keep a clean brief if an older local draft cannot be read.
    }
    brief.documents = Array.from(new Set([...brief.documents, ...requestedRecords.map((record) => record.title)]));
    brief.notes = [brief.notes, requestText].filter(Boolean).join("\n\n");
    brief.savedAt = new Date().toISOString();
    window.localStorage.setItem(QUALITY_BRIEF_KEY, JSON.stringify(brief));
  }

  return (
    <section className="buyer-trust" aria-labelledby="buyer-trust-title">
      <div className="buyer-trust-shell">
        <header className="buyer-trust-heading">
          <div>
            <span>Buyer evidence desk</span>
            <h2 id="buyer-trust-title">Trust should be traceable.</h2>
          </div>
          <p>Every photograph, report, partner, outcome and certificate is labelled by its current evidence status. Details are published only when the supporting source can be checked.</p>
        </header>

        <div className="buyer-trust-status-guide" aria-label="Evidence status guide">
          {(Object.entries(statusDetails) as [BuyerTrustEvidenceStatus, (typeof statusDetails)[BuyerTrustEvidenceStatus]][]).map(([status, item]) => (
            <div key={status} data-status={status}>
              <span><i aria-hidden="true" /> {item.label}</span>
              <p>{item.note}</p>
            </div>
          ))}
        </div>

        <div className="buyer-trust-media">
          <div className="buyer-trust-media-intro">
            <span>Current media</span>
            <h3>Context, clearly labelled</h3>
            <p>These photographs are visual references. They do not claim to show a Leo Infinity inspection, customer order or completed shipment.</p>
          </div>
          {representativeMedia.map((item) => (
            <Dialog key={item.title}>
              <figure>
                <SmartImage src={item.image} alt={item.title} width={900} height={650} className="h-full w-full object-cover" />
                <span className="buyer-trust-media-label"><i aria-hidden="true" /> Representative image</span>
                <DialogTrigger asChild>
                  <button type="button" aria-label={`View ${item.title} fullscreen`}><Maximize2 aria-hidden="true" /> View</button>
                </DialogTrigger>
                <figcaption><strong>{item.title}</strong><small>{item.description}</small></figcaption>
              </figure>
              <DialogContent className="buyer-trust-dialog max-w-5xl!">
                <DialogHeader><DialogTitle>{item.title}</DialogTitle><DialogDescription>{item.description} This is representative imagery, not shipment evidence.</DialogDescription></DialogHeader>
                <SmartImage src={item.image} alt={item.title} width={1600} height={1100} className="max-h-[72vh] w-full object-contain" />
              </DialogContent>
            </Dialog>
          ))}
        </div>

        <div className="buyer-trust-register-heading">
          <div><span>Evidence register</span><h3>See what is verified, conditional or still required</h3></div>
          <div role="group" aria-label="Filter evidence by status">
            {(["all", "verified", "order-specific", "representative", "awaiting-source"] as const).map((status) => (
              <button key={status} type="button" aria-pressed={activeStatus === status} onClick={() => setActiveStatus(status)}>
                {status === "all" ? "All" : statusDetails[status].label}
              </button>
            ))}
          </div>
        </div>

        <div className="buyer-trust-table-wrap">
          <table className="buyer-trust-table">
            <thead><tr><th>Evidence</th><th>Status</th><th>Authority / date / scope</th><th><span className="sr-only">Request</span></th></tr></thead>
            <tbody>
              {!visibleRecords.length && <tr className="buyer-trust-empty"><td colSpan={4}><ShieldCheck aria-hidden="true" /><strong>No records are published with this status yet.</strong><span>Verified evidence will appear here only after its source, scope, dates and publishing approval are confirmed.</span></td></tr>}
              {visibleRecords.map((record) => {
                const Icon = categoryIcons[record.category];
                const isSelected = selected.includes(record.id);
                return (
                  <tr key={record.id}>
                    <td data-label="Evidence"><span className="buyer-trust-record-icon"><Icon aria-hidden="true" /></span><div><small>{categoryLabels[record.category]}</small><strong>{record.title}</strong><p>{record.summary}</p></div></td>
                    <td data-label="Status"><span className="buyer-trust-status" data-status={record.status}><i aria-hidden="true" /> {statusDetails[record.status].label}</span></td>
                    <td data-label="Evidence details">
                      <dl>
                        <div><dt>Issuer</dt><dd>{record.issuer ?? "Confirmed before publication"}</dd></div>
                        <div><dt>Date</dt><dd>{record.issueDate ?? "Not published"}{record.validUntil ? ` · valid to ${record.validUntil}` : ""}</dd></div>
                        <div><dt>Scope</dt><dd>{record.scope ?? "Source record required"}</dd></div>
                        <div><dt>Check</dt><dd>{record.verificationMethod ?? "Source and approval review"}</dd></div>
                      </dl>
                      {record.downloadUrl && record.status === "verified" && <a href={record.downloadUrl} download>{record.downloadLabel ?? "Download verified document"}</a>}
                    </td>
                    <td data-label="Request"><button type="button" className={isSelected ? "is-selected" : ""} aria-pressed={isSelected} onClick={() => toggleRequest(record.id)}><span>{isSelected ? "Added" : "Request"}</span>{isSelected ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="buyer-trust-request">
          <div className="buyer-trust-request-copy"><ShieldCheck aria-hidden="true" /><div><span>Evidence request</span><h3>{requestedRecords.length ? `${requestedRecords.length} item${requestedRecords.length === 1 ? "" : "s"} selected` : "Build a document request"}</h3><p>Ask for evidence that applies to the named product, supplier, facility or shipment. Availability is confirmed with the quotation.</p></div></div>
          <pre aria-live="polite">{requestText}</pre>
          <div className="buyer-trust-request-actions">
            <button type="button" onClick={copyRequest} disabled={!requestedRecords.length}><ClipboardCopy aria-hidden="true" /> {copyState === "copied" ? "Request copied" : copyState === "error" ? "Copy unavailable" : "Copy request"}</button>
            <Link to="/request-quote" search={{ quality: true }} onClick={saveRequestForEnquiry} className={requestedRecords.length ? "" : "is-disabled"} aria-disabled={!requestedRecords.length} tabIndex={requestedRecords.length ? undefined : -1}>Add to enquiry <ArrowRight aria-hidden="true" /></Link>
          </div>
          <p className="buyer-trust-request-note"><CheckCircle2 aria-hidden="true" /> Buyers can also attach their own specification, report or reference file in the quote wizard.</p>
        </div>
      </div>
    </section>
  );
}
