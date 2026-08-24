import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { contact } from "@/data/catalog";
import { Field, PageHero } from "@/components/ui-primitives";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — GlobalTerra Food Trading" },
      {
        name: "description",
        content:
          "Reach GlobalTerra's export desk by phone, WhatsApp or email. Offices in Dubai, UAE and Mumbai, India. Send your product enquiry today.",
      },
      { property: "og:title", content: "Contact Us — GlobalTerra Food Trading" },
      { property: "og:description", content: "Export desk in Dubai and sourcing office in Mumbai. We reply within one business day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const infoCards = [
  { icon: MapPin, label: "Head Office", value: contact.address },
  { icon: MapPin, label: "Sourcing Office", value: contact.indiaOffice },
  { icon: Phone, label: "Phone", value: contact.phone },
  { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp },
  { icon: Mail, label: "Email", value: contact.email },
  { icon: Clock, label: "Business Hours", value: contact.hours },
];

function ContactPage() {
  return (
    <div>
      <PageHero
        eyebrow="Get In Touch"
        title="Contact Us"
        subtitle="Our export desk responds to every enquiry within one business day — usually much faster on WhatsApp."
      />

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          {/* Info cards */}
          <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {infoCards.map((c) => (
              <div key={c.label} className="flex items-start gap-4 rounded-sm border border-border bg-card p-6">
                <c.icon className="mt-1 size-5 shrink-0 text-accent" />
                <div>
                  <h3 className="mb-1 text-xs font-bold tracking-widest text-primary/50 uppercase">{c.label}</h3>
                  <p className="text-sm leading-relaxed text-foreground">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="grid gap-16 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <span className="eyebrow">Send an Enquiry</span>
              <h2 className="mb-6 font-serif text-3xl text-primary">Tell us what you're looking for</h2>
              <p className="mb-8 leading-relaxed text-muted-foreground">
                Share the product, quantity and destination — we'll come back with availability, specifications and
                pricing. For urgent requirements, message us directly on WhatsApp.
              </p>
              <a href={contact.whatsappLink} target="_blank" rel="noreferrer" className="btn-outline">
                <MessageCircle className="size-4" />
                Chat on WhatsApp
              </a>
            </div>
            <form
              className="grid grid-cols-1 gap-5 rounded-sm border border-border bg-card p-8 md:grid-cols-2 lg:col-span-3"
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Enquiry sent — we'll reply within one business day.");
                e.currentTarget.reset();
              }}
            >
              <Field label="Full Name">
                <input required type="text" className="field-input" placeholder="Your name" />
              </Field>
              <Field label="Company Name">
                <input type="text" className="field-input" placeholder="Company (optional)" />
              </Field>
              <Field label="Country">
                <input required type="text" className="field-input" placeholder="Your country" />
              </Field>
              <Field label="Phone Number">
                <input required type="tel" className="field-input" placeholder="+971 ..." />
              </Field>
              <Field label="Email">
                <input required type="email" className="field-input" placeholder="you@company.com" />
              </Field>
              <Field label="Interested Product">
                <input required type="text" className="field-input" placeholder="e.g. Chickpeas" />
              </Field>
              <Field label="Required Quantity">
                <input type="text" className="field-input" placeholder="e.g. 20 MT" />
              </Field>
              <Field label="Destination Country">
                <input type="text" className="field-input" placeholder="e.g. Saudi Arabia" />
              </Field>
              <Field label="Message" className="md:col-span-2">
                <textarea rows={4} className="field-textarea" placeholder="Any specifications or questions..." />
              </Field>
              <button type="submit" className="btn-accent md:col-span-2">
                Send Enquiry
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
