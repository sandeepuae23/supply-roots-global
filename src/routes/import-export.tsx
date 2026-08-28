import { createFileRoute, Link } from "@tanstack/react-router";
import tradePort from "@/assets/trade-port.jpg";
import import3d from "@/assets/3d-import.jpg";
import export3d from "@/assets/3d-export.jpg";
import import3dAvif1024 from "@/assets/3d-import-1024.avif";
import import3dAvif640 from "@/assets/3d-import-640.avif";
import import3dWebp1024 from "@/assets/3d-import-1024.webp";
import import3dWebp640 from "@/assets/3d-import-640.webp";
import export3dAvif1024 from "@/assets/3d-export-1024.avif";
import export3dAvif640 from "@/assets/3d-export-640.avif";
import export3dWebp1024 from "@/assets/3d-export-1024.webp";
import export3dWebp640 from "@/assets/3d-export-640.webp";
import { CheckItem, PageHero, SectionHeading } from "@/components/ui-primitives";

export const Route = createFileRoute("/import-export")({
  head: () => ({
    meta: [
      { title: "Import & Export Services — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "End-to-end food import and export services: sourcing, verification, documentation, freight coordination, customs clearance and quality inspection. EXW, FOB, CFR, CIF, DDP.",
      },
      { property: "og:title", content: "Import & Export Services — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "Precision-sourced agricultural commodities moved across borders with full documentation support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportExportPage,
});

const importServices = [
  "Supplier sourcing",
  "Product verification",
  "Documentation",
  "Freight coordination",
  "Customs clearance coordination",
  "Quality inspection",
];

const exportServices = [
  "Product sourcing",
  "Export packaging",
  "Documentation",
  "Certificates",
  "Port coordination",
  "Shipping",
];

const tradeTerms = [
  { code: "EXW", name: "Ex Works", text: "Buyer collects from our facility; we prepare goods and export packing." },
  { code: "FOB", name: "Free On Board", text: "We deliver loaded on vessel at origin port; buyer arranges freight." },
  { code: "CFR", name: "Cost & Freight", text: "We cover ocean freight to your destination port; insurance is yours." },
  { code: "CIF", name: "Cost, Insurance & Freight", text: "Freight and marine insurance to your port, fully arranged." },
  { code: "DDP", name: "Delivered Duty Paid", text: "Door delivery with duties handled — available in select markets." },
];

const process = [
  { step: "01", title: "Enquiry & Specification", text: "Share product, grade, quantity and destination requirements." },
  { step: "02", title: "Quotation & Samples", text: "Receive pricing on your Incoterm, plus pre-shipment samples on request." },
  { step: "03", title: "Contract & Inspection", text: "Confirmed order with third-party quality inspection before loading." },
  { step: "04", title: "Documentation & Shipping", text: "Certificates, customs paperwork, port coordination and dispatch." },
  { step: "05", title: "Delivery & Support", text: "Tracking to destination with post-delivery claims support." },
];

function ImportExportPage() {
  return (
    <div>
      <PageHero
        image={tradePort}
        eyebrow="International Trading"
        title="Import & Export Services"
        subtitle="End-to-end movement of food commodities across borders — sourcing, verification, documentation, freight and customs, handled by one accountable team."
      />

      {/* Services */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="surface-3d overflow-hidden rounded-sm border border-border bg-card">
            <img
              src={import3d}
              alt="Container ship arriving at port — import services"
              loading="lazy"
              width={1024}
              height={768}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-10">
              <span className="eyebrow">Bringing Goods In</span>
              <h2 className="mb-8 font-serif text-3xl text-primary">Import Services</h2>
              <ul className="grid gap-4 text-sm sm:grid-cols-2">
                {importServices.map((s) => (
                  <CheckItem key={s}>{s}</CheckItem>
                ))}
              </ul>
            </div>
          </div>
          <div className="surface-3d overflow-hidden rounded-sm border border-border bg-card">
            <img
              src={export3d}
              alt="Containers loaded for shipment — export services"
              loading="lazy"
              width={1024}
              height={768}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-10">
              <span className="eyebrow">Sending Goods Out</span>
              <h2 className="mb-8 font-serif text-3xl text-primary">Export Services</h2>
              <ul className="grid gap-4 text-sm sm:grid-cols-2">
                {exportServices.map((s) => (
                  <CheckItem key={s}>{s}</CheckItem>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-card px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="How a Shipment Runs" title="Our Trade Process" />
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
            {process.map((p) => (
              <div key={p.step} className="rounded-sm border border-border bg-background p-6">
                <span className="font-serif text-3xl text-accent">{p.step}</span>
                <h3 className="mt-4 mb-2 font-semibold text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Incoterms */}
      <section className="bg-primary px-6 py-24 text-cream">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <span className="eyebrow">Flexible Terms</span>
            <h2 className="font-serif text-4xl text-cream">Trade Terms We Support</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {tradeTerms.map((t) => (
              <div key={t.code} className="rounded-sm border border-cream/15 p-6">
                <h3 className="font-serif text-2xl text-accent">{t.code}</h3>
                <p className="mt-1 mb-3 text-xs font-bold tracking-widest text-cream/60 uppercase">{t.name}</p>
                <p className="text-sm leading-relaxed text-cream/75">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl text-primary">Tell us your trade lane</h2>
          <p className="mt-4 text-muted-foreground">
            Origin, destination, product and volume — we'll return a landed-cost view with documentation requirements.
          </p>
          <Link to="/request-quote" className="btn-accent mt-8">
            Request a Quote
          </Link>
        </div>
      </section>
    </div>
  );
}
