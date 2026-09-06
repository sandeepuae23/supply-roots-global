import { createFileRoute, Link } from "@tanstack/react-router";
import headquarters from "@/assets/about-headquarters.jpg";
import inspection from "@/assets/about-inspection.jpg";
import partnership from "@/assets/about-partnership.jpg";
import { CheckItem, PageHero, SectionHeading } from "@/components/ui-primitives";
import { SmartImage } from "@/components/smart-image";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Leo Infinity Global General Trading" },
      {
        name: "description",
        content:
          "Leo Infinity is an international food trading company sourcing, importing, exporting and supplying high-quality agricultural and food products worldwide.",
      },
      { property: "og:title", content: "About Us — Leo Infinity Global General Trading" },
      {
        property: "og:description",
        content: "A trusted global food trading partner connecting quality producers with international buyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const whatWeDo = [
  "Food sourcing",
  "Importing",
  "Exporting",
  "Wholesale distribution",
  "Private-label supply",
  "Bulk trading",
  "Packaging",
  "Shipping coordination",
  "Customs documentation assistance",
];

const values = [
  { name: "Quality", text: "Every lot inspected, graded and documented before shipment." },
  { name: "Transparency", text: "Clear pricing, honest specifications and open communication." },
  { name: "Reliability", text: "Consistent supply, on-time delivery, contract after contract." },
  { name: "Food Safety", text: "Certified suppliers, lab testing and full traceability." },
  { name: "Customer Satisfaction", text: "Dedicated account managers for every business client." },
  { name: "Long-term Partnerships", text: "We grow with our farmers, buyers and distributors." },
];

function AboutPage() {
  return (
    <div>
      <PageHero
        image={headquarters}
        eyebrow="About Our Company"
        title="Who We Are"
        subtitle="Leo Infinity Global General Trading is a licensed international food trading company. We source, import, export and supply premium agricultural and food products to distributors, retailers, manufacturers and foodservice businesses across global markets."
      />

      {/* Introduction */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="eyebrow">Our Story</span>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground md:text-2xl">
            Founded on a commitment to quality and reliability, Leo Infinity has grown into a trusted bridge between
            world-class food producers and discerning buyers. From farm gate to destination port, we manage every stage
            of the supply chain — procurement, inspection, documentation, logistics and delivery — so our partners can
            trade with confidence.
          </p>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="bg-card px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-sm border border-border bg-background p-10">
            <span className="eyebrow">Our Mission</span>
            <p className="text-lg leading-relaxed text-muted-foreground">
              To deliver safe, compliant and competitively priced food products that meet the exact standards of every
              destination market, while building enduring partnerships with growers, processors, exporters, importers,
              wholesalers and retailers worldwide.
            </p>
          </div>
          <div className="rounded-sm border border-border bg-background p-10">
            <span className="eyebrow">Our Vision</span>
            <p className="text-lg leading-relaxed text-muted-foreground">
              To be a globally recognized food trading partner known for integrity, operational excellence and the
              consistent delivery of value across every continent we serve.
            </p>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="bg-card px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Capabilities" title="What We Do" />
          <ul className="grid gap-x-12 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {whatWeDo.map((item) => (
              <CheckItem key={item}>{item}</CheckItem>
            ))}
          </ul>
        </div>
      </section>

      {/* Image gallery */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Who We Are" title="Company in Action" center />
          <div className="grid gap-8 md:grid-cols-2">
            <SmartImage
              src={inspection}
              alt="Quality inspectors examining fresh produce in a modern warehouse"
              sizes="(max-width: 768px) 100vw, 50vw"
              className="surface-3d aspect-[4/3] w-full rounded-sm object-cover"
            />
            <SmartImage
              src={partnership}
              alt="Business partners shaking hands over global trade documents"
              sizes="(max-width: 768px) 100vw, 50vw"
              className="surface-3d aspect-[4/3] w-full rounded-sm object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-primary px-6 py-24 text-cream">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <span className="eyebrow">How We Work</span>
            <h2 className="font-serif text-4xl text-cream">Our Values</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div key={v.name} className="rounded-sm border border-cream/15 p-8">
                <h3 className="mb-3 font-serif text-xl text-cream">{v.name}</h3>
                <p className="text-sm leading-relaxed text-cream/70">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl text-primary">Partner with a supplier you can trust</h2>
          <p className="mt-4 text-muted-foreground">
            Tell us what you need and our export desk will respond with pricing, specifications and lead times.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/request-quote" className="btn-accent">
              Request a Quote
            </Link>
            <Link to="/products" className="btn-outline">
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
