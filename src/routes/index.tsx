import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import heroFields from "@/assets/hero-fields.jpg";
import warehouseOps from "@/assets/warehouse-ops.jpg";
import { categories, contact, featuredProducts, markets, tradeLanes } from "@/data/catalog";
import { CheckItem, Field, SectionHeading } from "@/components/ui-primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Food Import & Export — GlobalTerra Food Trading" },
      {
        name: "description",
        content:
          "Supplying quality vegetables, fruits, rice, pulses, eggs, spices, grains and food products across UAE, India, Saudi Arabia, Qatar, Oman, Europe, Africa and Asia.",
      },
      { property: "og:title", content: "Global Food Import & Export — GlobalTerra Food Trading" },
      {
        property: "og:description",
        content: "Quality food products. Reliable global supply. Explore 12 product categories for international markets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const whyChooseUs = [
  "Reliable international sourcing",
  "Quality-controlled products",
  "Competitive pricing",
  "Export documentation support",
  "Flexible packaging",
  "Bulk order supply",
  "International logistics support",
  "On-time delivery",
];

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden">
        <img
          src={heroFields}
          alt="Aerial view of lush green farmland at sunrise"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/55" />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-24">
          <span className="eyebrow">Quality Food Products. Reliable Global Supply.</span>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.1] text-cream md:text-7xl">
            Global Food <span className="italic">Import & Export</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/90">
            Supplying quality vegetables, fruits, rice, pulses, eggs, spices, grains and food products across
            international markets — with precision and integrity.
          </p>
          <p className="mt-4 text-sm font-semibold tracking-widest text-cream/70 uppercase">
            Vegetables • Fruits • Rice • Pulses • Eggs • Spices
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/products" className="btn-light">
              View Products
            </Link>
            <Link to="/request-quote" className="btn-accent">
              Request a Quote
            </Link>
            <Link to="/contact" className="btn-outline-light">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Product categories */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Our Catalog"
            title="Product Categories"
            action={
              <Link to="/products" className="border-b-2 border-accent pb-1 font-semibold text-primary">
                Explore All Products
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.slug} to="/products" hash={c.slug} className="group cursor-pointer">
                <div className="mb-4 aspect-square overflow-hidden rounded-sm bg-secondary">
                  <img
                    src={c.image}
                    alt={c.name}
                    width={600}
                    height={600}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h4 className="text-center font-medium text-primary">{c.name}</h4>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About strip */}
      <section className="bg-card px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="overflow-hidden rounded-sm">
            <img
              src={warehouseOps}
              alt="Organized crates of grains and pulses in an export warehouse"
              width={1200}
              height={800}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="eyebrow">About Our Company</span>
            <h2 className="mb-6 font-serif text-4xl text-primary md:text-5xl">
              A reliable international sourcing & supply partner
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              GlobalTerra is an international food trading company specializing in sourcing, importing, exporting and
              supplying high-quality agricultural and food products to businesses worldwide.
            </p>
            <ul className="mb-10 grid gap-3 text-sm sm:grid-cols-2">
              <CheckItem>Food sourcing & bulk trading</CheckItem>
              <CheckItem>Import & export operations</CheckItem>
              <CheckItem>Private-label supply</CheckItem>
              <CheckItem>Customs documentation assistance</CheckItem>
            </ul>
            <Link to="/about" className="btn-primary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Market Essentials"
            title="Featured Products"
            action={
              <Link to="/products" className="border-b-2 border-accent pb-1 font-semibold text-primary">
                View Full Catalog
              </Link>
            }
          />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((p) => (
              <div key={p.slug} className="group rounded-sm border border-border bg-card">
                <Link
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="block aspect-[4/3] overflow-hidden rounded-t-sm"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
                <div className="p-6">
                  <h4 className="font-serif text-xl text-primary">{p.name}</h4>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-semibold text-primary/70">Origin:</span> {p.origin}
                    </p>
                    <p>
                      <span className="font-semibold text-primary/70">Packing:</span> {p.packaging}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <Link
                      to="/products/$slug"
                      params={{ slug: p.slug }}
                      className="text-sm font-semibold text-primary transition-colors hover:text-accent"
                    >
                      View Details
                    </Link>
                    <Link
                      to="/request-quote"
                      className="text-sm font-bold tracking-wider text-accent uppercase transition-colors hover:text-primary"
                    >
                      Enquire Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-primary px-6 py-24 text-cream">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <span className="eyebrow">Trade Assurance</span>
            <h2 className="font-serif text-4xl text-cream">Why Choose Us</h2>
          </div>
          <ul className="grid gap-x-12 gap-y-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map((item) => (
              <CheckItem key={item} light>
                {item}
              </CheckItem>
            ))}
          </ul>
        </div>
      </section>

      {/* Global markets */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Global Reach" title="Countries & Markets We Serve" center />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            {markets.map((m, i) => (
              <span key={m} className="inline-flex items-center gap-4">
                {i > 0 && <span className="text-accent">•</span>}
                {m}
              </span>
            ))}
          </div>
          <div className="mt-10 grid gap-3 text-center text-sm font-medium text-primary sm:grid-cols-2 lg:grid-cols-3">
            {tradeLanes.map((lane) => (
              <div key={lane} className="rounded-sm border border-border bg-card px-4 py-3">
                {lane}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business clients band */}
      <section className="bg-secondary px-6 py-24">
        <div className="mx-auto max-w-7xl text-center">
          <span className="eyebrow">Business Clients</span>
          <h2 className="font-serif text-4xl text-primary">Looking for bulk supply?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
            Importers | Wholesalers | Supermarkets | Hotels | Restaurants | Distributors | Catering Companies | Food
            Processors
          </p>
          <Link to="/business-clients" className="btn-primary mt-10">
            Become a Business Client
          </Link>
        </div>
      </section>

      {/* Quick quote */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="Get Pricing" title="Request a Quote" center />
          <form
            className="grid grid-cols-1 gap-6 rounded-sm border border-border bg-card p-8 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Enquiry received — our trade desk will contact you within one business day.");
              e.currentTarget.reset();
            }}
          >
            <Field label="Product">
              <input required type="text" className="field-input" placeholder="e.g. 1121 Basmati Rice" />
            </Field>
            <Field label="Quantity">
              <input required type="text" className="field-input" placeholder="e.g. 20 MT" />
            </Field>
            <Field label="Destination">
              <input required type="text" className="field-input" placeholder="e.g. Jebel Ali, Dubai" />
            </Field>
            <Field label="Email">
              <input required type="email" className="field-input" placeholder="you@company.com" />
            </Field>
            <button type="submit" className="btn-accent md:col-span-2">
              Get Quote
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Prefer to talk? WhatsApp us at{" "}
            <a href={contact.whatsappLink} target="_blank" rel="noreferrer" className="font-semibold text-accent">
              {contact.whatsapp}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
