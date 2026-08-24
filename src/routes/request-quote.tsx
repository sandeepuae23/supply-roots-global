import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { products } from "@/data/catalog";
import { Field, PageHero } from "@/components/ui-primitives";

export const Route = createFileRoute("/request-quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote — GlobalTerra Food Trading" },
      {
        name: "description",
        content:
          "B2B quotation for food import & export: product, specification, quantity, origin, destination port, packaging and Incoterm (FOB / CIF / CFR / EXW).",
      },
      { property: "og:title", content: "Request a Quote — GlobalTerra Food Trading" },
      {
        property: "og:description",
        content: "Detailed B2B quotation with specifications, packaging and Incoterms — response within one business day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestQuotePage,
});

function RequestQuotePage() {
  return (
    <div>
      <PageHero
        eyebrow="B2B Quotation"
        title="Request a Quote"
        subtitle="The more detail you share, the sharper our pricing. Our trade desk responds within one business day with availability, specifications and landed-cost options."
      />

      <section className="px-6 py-24">
        <form
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 rounded-sm border border-border bg-card p-8 md:grid-cols-2 lg:p-12"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Quotation request received — our trade desk will respond within one business day.");
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-serif text-2xl text-primary md:col-span-2">Company Details</h2>
          <Field label="Company Name">
            <input required type="text" className="field-input" placeholder="Your company" />
          </Field>
          <Field label="Contact Person">
            <input required type="text" className="field-input" placeholder="Full name" />
          </Field>
          <Field label="Email">
            <input required type="email" className="field-input" placeholder="you@company.com" />
          </Field>
          <Field label="Phone">
            <input required type="tel" className="field-input" placeholder="+971 ..." />
          </Field>

          <h2 className="mt-4 font-serif text-2xl text-primary md:col-span-2">Product Requirements</h2>
          <Field label="Product">
            <select required className="field-select" defaultValue="">
              <option value="" disabled>
                Select a product
              </option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
              <option value="other">Other / Not listed</option>
            </select>
          </Field>
          <Field label="Product Specification">
            <input type="text" className="field-input" placeholder="Grade, variety, size..." />
          </Field>
          <Field label="Quantity">
            <input required type="text" className="field-input" placeholder="e.g. 40" />
          </Field>
          <Field label="Unit">
            <select required className="field-select" defaultValue="">
              <option value="" disabled>
                Select unit
              </option>
              <option>MT (Metric Tons)</option>
              <option>KG</option>
              <option>Containers (20' FCL)</option>
              <option>Containers (40' FCL)</option>
              <option>Cartons</option>
            </select>
          </Field>
          <Field label="Country of Origin Preferred">
            <input type="text" className="field-input" placeholder="e.g. India" />
          </Field>
          <Field label="Destination Country">
            <input required type="text" className="field-input" placeholder="e.g. UAE" />
          </Field>
          <Field label="Destination Port">
            <input type="text" className="field-input" placeholder="e.g. Jebel Ali" />
          </Field>
          <Field label="Packaging Requirement">
            <input type="text" className="field-input" placeholder="e.g. 25kg PP bags, private label" />
          </Field>

          <h2 className="mt-4 font-serif text-2xl text-primary md:col-span-2">Terms & Timeline</h2>
          <Field label="Incoterm">
            <select required className="field-select" defaultValue="">
              <option value="" disabled>
                Select Incoterm
              </option>
              <option>FOB</option>
              <option>CIF</option>
              <option>CFR</option>
              <option>EXW</option>
              <option>DDP (where available)</option>
            </select>
          </Field>
          <Field label="Expected Delivery Date">
            <input type="date" className="field-input" />
          </Field>
          <Field label="Additional Requirements" className="md:col-span-2">
            <textarea
              rows={4}
              className="field-textarea"
              placeholder="Certificates needed, labeling, inspection requirements, target price..."
            />
          </Field>
          <button type="submit" className="btn-accent md:col-span-2">
            Request Quotation
          </button>
        </form>
      </section>
    </div>
  );
}
