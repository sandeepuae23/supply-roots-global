import { createFileRoute, Link } from "@tanstack/react-router";
import qualityLab from "@/assets/quality-lab.jpg";
import qualLabTesting from "@/assets/qual-lab-testing.jpg";
import qualInspection from "@/assets/qual-inspection.jpg";
import qualCertificates from "@/assets/qual-certificates.jpg";
import { CheckItem, SectionHeading } from "@/components/ui-primitives";
import { SmartImage } from "@/components/smart-image";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Quality & Certifications — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Food safety, quality inspection, phytosanitary certificates, certificates of origin, health and veterinary certificates, lab testing and export packing standards.",
      },
      { property: "og:title", content: "Quality & Certifications — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "Every shipment inspected, tested and documented to destination-market requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QualityPage,
});

const qualityPillars = [
  {
    title: "Food Safety",
    text: "Suppliers audited against HACCP-aligned practices; hygienic handling from farm gate to container.",
  },
  {
    title: "Quality Inspection",
    text: "Pre-shipment inspection by independent surveyors on request — quantity, quality and packing verified.",
  },
  {
    title: "Laboratory Testing",
    text: "Accredited lab reports for moisture, purity, residue and microbiological parameters per lot.",
  },
  {
    title: "Packing Standards",
    text: "Export-grade materials, fumigated pallets and container loading supervised to specification.",
  },
];

const certificates = [
  "Phytosanitary certificates",
  "Certificate of origin",
  "Health certificates",
  "Veterinary certificates",
  "Organic certificates (where applicable)",
  "Halal certificates (where applicable)",
  "Fumigation certificates",
  "Third-party lab analysis reports",
];

function QualityPage() {
  return (
    <div>
      {/* Hero split */}
      <section className="bg-card px-6 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Quality & Certifications</span>
            <h1 className="mb-6 font-serif text-4xl text-primary md:text-5xl">
              Documented quality on every shipment
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              International food trade runs on trust and paperwork. We treat both as core product: certified suppliers,
              inspected lots, and complete documentation matched to your destination market's requirements.
            </p>
          </div>
          <div className="overflow-hidden rounded-sm">
            <SmartImage
              src={qualityLab}
              alt="Laboratory technician inspecting grain samples under a microscope"
              width={1200}
              height={800}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Our Standards" title="How We Control Quality" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {qualityPillars.map((p) => (
              <div key={p.title} className="rounded-sm border border-border bg-card p-8">
                <h3 className="mb-3 font-serif text-xl text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="bg-primary px-6 py-24 text-cream">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Documentation</span>
            <h2 className="mb-6 font-serif text-4xl text-cream">Certificates & Compliance</h2>
            <p className="leading-relaxed text-cream/70">
              Certificates are issued per shipment through accredited authorities and supplier certifications. Tell us
              your destination country and product — we will confirm the exact document set available for your order.
            </p>
          </div>
          <ul className="grid content-start gap-4 text-sm">
            {certificates.map((c) => (
              <CheckItem key={c} light>
                {c}
              </CheckItem>
            ))}
          </ul>
        </div>
      </section>

      {/* Quality gallery */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="In Practice" title="Quality in Action" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { src: qualLabTesting, alt: "Laboratory technician testing grain and spice samples under a microscope" },
              { src: qualInspection, alt: "Surveyor inspecting export food sacks inside a shipping container" },
              { src: qualCertificates, alt: "Official export certificates and stamps on a documentation desk" },
            ].map((img) => (
              <div key={img.src} className="surface-3d overflow-hidden rounded-sm">
                <SmartImage
                  src={img.src}
                  alt={img.alt}
                  width={1024}
                  height={768}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl text-primary">Need a specific certificate?</h2>
          <p className="mt-4 text-muted-foreground">
            Share your destination market and product list — our compliance desk will confirm available documentation.
          </p>
          <Link to="/contact" className="btn-primary mt-8">
            Contact Our Team
          </Link>
        </div>
      </section>
    </div>
  );
}
