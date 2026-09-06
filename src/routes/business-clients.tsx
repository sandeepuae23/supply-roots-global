import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import businessPort from "@/assets/business-port.jpg";
import businessWarehouse from "@/assets/business-warehouse.jpg";
import businessPackaging from "@/assets/business-packaging.jpg";
import { CheckItem, Field, PageHero, SectionHeading } from "@/components/ui-primitives";
import { SmartImage } from "@/components/smart-image";

export const Route = createFileRoute("/business-clients")({
  head: () => ({
    meta: [
      { title: "Business & Wholesale Solutions — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Bulk purchasing, contract supply, private labeling and container supply for importers, wholesalers, supermarkets, hotels, restaurants and food distributors.",
      },
      { property: "og:title", content: "Business & Wholesale Solutions — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "Wholesale food supply with competitive pricing, flexible packaging and dedicated account management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessClientsPage,
});

const clientTypes = [
  "Importers",
  "Exporters",
  "Supermarkets",
  "Hypermarkets",
  "Restaurants",
  "Hotels",
  "Food Distributors",
  "Wholesalers",
  "Retail Chains",
  "Catering Companies",
  "Food Processors",
];

const services = [
  "Bulk purchasing",
  "Contract supply",
  "Monthly supply agreements",
  "Customized packaging",
  "Private labeling",
  "Container supply",
  "Competitive wholesale pricing",
  "International shipping",
  "Documentation support",
  "Dedicated account manager",
];

function BusinessClientsPage() {
  return (
    <div>
      <PageHero
        image={businessPort}
        eyebrow="For Trade Buyers"
        title="Business & Wholesale Solutions"
        subtitle="Consistent supply chains, customized packaging and full documentation support for volume buyers across the Gulf, Europe, Africa and Asia."
      />

      {/* Who we serve */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <span className="eyebrow">Who We Serve</span>
            <h2 className="font-serif text-4xl text-primary">Built for Volume Buyers</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {clientTypes.map((t) => (
              <span
                key={t}
                className="rounded-sm border border-primary/20 bg-card px-5 py-2.5 text-sm font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Visual gallery */}
          <section className="mt-20 px-6">
            <div className="mx-auto max-w-7xl">
              <SectionHeading eyebrow="At Scale" title="Wholesale in Action" center />
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  {
                    src: businessWarehouse,
                    alt: "Wholesale food warehouse with pallets of rice, spices, pulses and dry fruits",
                  },
                  {
                    src: businessPackaging,
                    alt: "Private-label food packaging line with branded pouches on a conveyor belt",
                  },
                ].map((img) => (
                  <div key={img.src} className="surface-3d overflow-hidden rounded-sm">
                    <SmartImage
                      src={img.src}
                      alt={img.alt}
                      width={1024}
                      height={768}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-20 grid gap-16 lg:grid-cols-2">
            <div>
              <span className="eyebrow">Services</span>
              <h2 className="mb-8 font-serif text-3xl text-primary">What Business Clients Get</h2>
              <ul className="grid gap-4 text-sm sm:grid-cols-2">
                {services.map((s) => (
                  <CheckItem key={s}>{s}</CheckItem>
                ))}
              </ul>
            </div>
            <div className="rounded-sm border border-border bg-card p-8 lg:p-10">
              <h3 className="mb-6 text-center font-serif text-2xl text-primary">Become a Business Client</h3>
              <form
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Thank you — our wholesale team will reach out within one business day.");
                  e.currentTarget.reset();
                }}
              >
                <Field label="Company Name">
                  <input required type="text" className="field-input" placeholder="Your company" />
                </Field>
                <Field label="Contact Person">
                  <input required type="text" className="field-input" placeholder="Full name" />
                </Field>
                <Field label="Country">
                  <input required type="text" className="field-input" placeholder="e.g. United Arab Emirates" />
                </Field>
                <Field label="Email">
                  <input required type="email" className="field-input" placeholder="you@company.com" />
                </Field>
                <Field label="Phone">
                  <input required type="tel" className="field-input" placeholder="+971 ..." />
                </Field>
                <Field label="Product Required">
                  <input required type="text" className="field-input" placeholder="e.g. Basmati Rice" />
                </Field>
                <Field label="Quantity">
                  <input required type="text" className="field-input" placeholder="e.g. 50 MT / month" />
                </Field>
                <Field label="Destination">
                  <input required type="text" className="field-input" placeholder="Port / city" />
                </Field>
                <Field label="Message" className="md:col-span-2">
                  <textarea rows={4} className="field-textarea" placeholder="Specifications, packaging, timelines..." />
                </Field>
                <button type="submit" className="btn-accent md:col-span-2">
                  Become a Business Client
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
