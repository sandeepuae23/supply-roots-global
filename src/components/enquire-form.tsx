import { toast } from "sonner";
import { Field } from "@/components/ui-primitives";

export function EnquireForm({ productName }: { productName: string }) {
  return (
    <form
      id="enquire"
      className="grid grid-cols-1 gap-6 rounded-sm border border-border bg-card p-8 md:grid-cols-2 lg:p-10"
      onSubmit={(e) => {
        e.preventDefault();
        toast.success(`Enquiry for ${productName} received — our trade desk will respond within one business day.`);
        e.currentTarget.reset();
      }}
    >
      <div className="md:col-span-2">
        <span className="eyebrow">Enquire Now</span>
        <h2 className="font-serif text-3xl text-primary">Enquire about {productName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your requirement and we will revert with pricing, availability and shipping options.
        </p>
      </div>

      <Field label="Company Name">
        <input required type="text" name="company" className="field-input" placeholder="Your company" />
      </Field>
      <Field label="Contact Person">
        <input required type="text" name="name" className="field-input" placeholder="Full name" />
      </Field>
      <Field label="Email">
        <input required type="email" name="email" className="field-input" placeholder="you@company.com" />
      </Field>
      <Field label="Phone">
        <input required type="tel" name="phone" className="field-input" placeholder="+971 ..." />
      </Field>
      <Field label="Quantity Required">
        <input required type="text" name="quantity" className="field-input" placeholder="e.g. 40 MT" />
      </Field>
      <Field label="Destination Port / Country">
        <input required type="text" name="destination" className="field-input" placeholder="e.g. Jebel Ali, UAE" />
      </Field>
      <Field label="Incoterm">
        <select name="incoterm" className="field-select" defaultValue="">
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
      <Field label="Target Price (optional)">
        <input type="text" name="target" className="field-input" placeholder="e.g. USD 480 / MT CIF" />
      </Field>
      <Field label="Message" className="md:col-span-2">
        <textarea
          rows={4}
          name="message"
          className="field-textarea"
          placeholder="Packaging, certificates, labeling or inspection requirements..."
          defaultValue={`I would like a quotation for ${productName}.`}
        />
      </Field>
      <button type="submit" className="btn-accent md:col-span-2">
        Send Enquiry
      </button>
    </form>
  );
}
