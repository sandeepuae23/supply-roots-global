import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Container,
  FileCheck2,
  Globe2,
  Leaf,
  PackageCheck,
  Plane,
  Play,
  ScanSearch,
  ShieldCheck,
  Ship,
  Sprout,
  Truck,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SmartImage } from "@/components/smart-image";
import aboutPartnership from "@/assets/about-partnership.jpg";
import businessWarehouse from "@/assets/business-warehouse.jpg";
import businessPort from "@/assets/business-port.jpg";
import qualAudit from "@/assets/qual-audit.jpg";
import qualDocuments from "@/assets/qual-documents.jpg";
import qualInspection from "@/assets/qual-inspection.jpg";
import qualSampling from "@/assets/qual-sampling.jpg";

const process = [
  {
    icon: Sprout,
    title: "Sourcing",
    text: "Farm and processor options matched to your specification.",
  },
  {
    icon: ScanSearch,
    title: "Inspection",
    text: "Quality, grade and compliance checks before commitment.",
  },
  {
    icon: PackageCheck,
    title: "Packaging",
    text: "Export-ready packing, labels and palletisation for the journey.",
  },
  {
    icon: FileCheck2,
    title: "Documentation",
    text: "Commercial, origin and shipment documents coordinated in one place.",
  },
  {
    icon: Truck,
    title: "Delivery",
    text: "Sea, air or land movement tracked through to destination.",
  },
] as const;

const assurances = [
  {
    icon: ShieldCheck,
    title: "Quality controlled",
    text: "Product checks and inspection support configured for the agreed order.",
  },
  {
    icon: Globe2,
    title: "Global sourcing",
    text: "A flexible network across India, the Gulf, Asia, Africa and Europe.",
  },
  {
    icon: Boxes,
    title: "Built for bulk",
    text: "Container, pallet and contract supply for growing food businesses.",
  },
  {
    icon: ClipboardCheck,
    title: "Trade ready",
    text: "Packaging, certificates and export paperwork coordinated end to end.",
  },
  {
    icon: BadgeCheck,
    title: "Specification led",
    text: "Grades, sizes, origins and packing aligned before confirmation.",
  },
  {
    icon: Warehouse,
    title: "Reliable fulfilment",
    text: "Consolidation, cold-chain options and dispatch planning around your schedule.",
  },
] as const;

const regions = [
  {
    name: "UAE & Gulf",
    code: "GCC",
    title: "Our central distribution corridor",
    text: "Dubai and Jebel Ali connect our sourcing network to importers, wholesalers, hospitality groups and retailers throughout the Gulf.",
    locations: ["Dubai", "Saudi Arabia", "Qatar", "Oman", "Bahrain", "Kuwait"],
    modes: [Ship, Truck, Plane],
  },
  {
    name: "India",
    code: "IND",
    title: "Farm and processor sourcing network",
    text: "Direct access to established growing belts and processors for vegetables, fruits, rice, pulses, spices, grains and value-added foods.",
    locations: ["Mumbai", "Nashik", "Gujarat", "Punjab", "Kerala"],
    modes: [Ship, Truck, Plane],
  },
  {
    name: "Europe",
    code: "EUR",
    title: "Documented container supply",
    text: "Specification-led export programs routed through major European ports with coordinated inspection and documentation support.",
    locations: ["Rotterdam", "Mediterranean", "Northern Europe"],
    modes: [Ship, Plane],
  },
  {
    name: "Africa",
    code: "AFR",
    title: "Flexible regional trade lanes",
    text: "Staples, fresh produce and packaged food supply for importers and distributors across East and North African markets.",
    locations: ["Mombasa", "Cairo", "East Africa", "North Africa"],
    modes: [Ship, Truck],
  },
  {
    name: "Asia",
    code: "APAC",
    title: "Connected Asian sourcing and demand",
    text: "Consolidated sea and air freight options link specialist producers and buyers across major Asian trading hubs.",
    locations: ["Singapore", "South Asia", "Southeast Asia"],
    modes: [Ship, Plane],
  },
] as const;

const seasonalGroups = [
  { name: "Mango", months: [2, 3, 4, 5, 6], note: "Peak export window" },
  { name: "Grapes", months: [0, 1, 2, 3], note: "Fresh harvest" },
  { name: "Pomegranate", months: [0, 1, 2, 7, 8, 9, 10, 11], note: "Multiple harvests" },
  { name: "Onion", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], note: "Year-round programs" },
  { name: "Potato", months: [0, 1, 2, 3, 10, 11], note: "Main crop" },
  { name: "Citrus", months: [0, 1, 2, 9, 10, 11], note: "Winter season" },
] as const;

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const packaging = [
  {
    icon: PackageCheck,
    title: "Retail ready",
    size: "500 g - 5 kg",
    text: "Consumer packs with barcode, artwork and private-label support.",
  },
  {
    icon: Boxes,
    title: "Foodservice",
    size: "5 kg - 25 kg",
    text: "Practical formats for hotels, restaurants, caterers and processors.",
  },
  {
    icon: Warehouse,
    title: "Bulk commodity",
    size: "25 kg - 1 MT",
    text: "Woven sacks, cartons, drums and jumbo bags to product specification.",
  },
  {
    icon: Container,
    title: "Pallet & container",
    size: "Custom load plans",
    text: "Palletised, temperature-managed and mixed-container options.",
  },
] as const;

const qualityGallery = [
  {
    image: qualAudit,
    title: "Supplier quality audit",
    text: "Process and food-safety checks before approval.",
  },
  {
    image: qualSampling,
    title: "Representative sampling",
    text: "Documented samples from production and packed lots.",
  },
  {
    image: qualInspection,
    title: "Pre-shipment inspection",
    text: "Product, packing and loading verification.",
  },
  {
    image: qualDocuments,
    title: "Document review",
    text: "Shipment certificates and trade records prepared for export.",
  },
] as const;

const faqs = [
  {
    question: "What information do you need for a quotation?",
    answer:
      "Share the product, grade or specification, required quantity, packaging, destination port and preferred Incoterm. Our trade desk will confirm any missing details before pricing.",
  },
  {
    question: "Can you supply private-label products?",
    answer:
      "Yes. Private-label packaging is available for suitable products and order volumes, including artwork coordination, pack sizing and outer-carton requirements.",
  },
  {
    question: "Which shipping terms do you support?",
    answer:
      "We commonly support EXW, FOB, CFR and CIF. DDP may be available for selected destinations after reviewing the product and local import requirements.",
  },
  {
    question: "Do you arrange inspection and export documents?",
    answer:
      "Yes. We coordinate the commercial and shipment documents required for the agreed product and destination, together with third-party inspection when requested.",
  },
  {
    question: "Can I combine products in one shipment?",
    answer:
      "Mixed-product consolidation may be possible when products have compatible handling, temperature and documentation requirements. Tell us the intended mix and destination for review.",
  },
] as const;

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="home-section-intro">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function HowWeWork() {
  return (
    <section className="home-process" aria-labelledby="process-title">
      <div className="home-section-shell">
        <SectionIntro
          eyebrow="A clear route from origin to destination"
          title="How we work"
          text="One accountable workflow keeps quality, timing and paperwork aligned."
        />
        <ol className="home-process-list">
          {process.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <span className="home-process-number">0{index + 1}</span>
              <span className="home-process-icon">
                <Icon aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CompanyFilm() {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="home-film" aria-labelledby="film-title">
      <div className="home-section-shell home-film-grid">
        <div className="home-film-copy">
          <SectionIntro
            eyebrow="Inside Leo Infinity"
            title="Food trade, handled with care"
            text="See how sourcing, quality control, packaging and international movement come together across our network."
          />
          <div className="home-film-points">
            <span>
              <CheckCircle2 aria-hidden="true" /> Structured supplier matching
            </span>
            <span>
              <CheckCircle2 aria-hidden="true" /> Export-ready operations
            </span>
          </div>
          <Link to="/about" className="home-text-link">
            Meet our company <ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <div className="home-film-player">
          <video
            controls={playing}
            autoPlay={playing}
            muted
            loop
            playsInline
            preload="metadata"
            poster={aboutPartnership}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            aria-label="Leo Infinity company introduction"
          >
            <source src="/leo-infinity-introduction.mp4" type="video/mp4" />
          </video>
          {!playing && (
            <button
              type="button"
              className="home-film-play"
              onClick={(event) => {
                const video = event.currentTarget.previousElementSibling as HTMLVideoElement | null;
                void video?.play();
              }}
            >
              <Play fill="currentColor" aria-hidden="true" />
              <span>
                Play our story <small>00:15</small>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function WhyChooseCards() {
  return (
    <section className="home-assurance" aria-labelledby="assurance-title">
      <div className="home-section-shell">
        <SectionIntro
          eyebrow="Trade assurance"
          title="Why businesses choose us"
          text="Practical support across the parts of food trading that matter most."
        />
        <div className="home-assurance-grid">
          {assurances.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GlobalMarkets() {
  const [active, setActive] = useState(0);
  const region = regions[active]!;
  return (
    <section id="global-markets" className="home-markets" aria-labelledby="markets-title">
      <div className="home-section-shell">
        <SectionIntro
          eyebrow="Global reach"
          title="Markets connected by one trade desk"
          text="Select a region to explore the routes, transport options and buyers we support."
        />
        <div className="home-market-tabs" role="tablist" aria-label="Global market regions">
          {regions.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              id={`market-tab-${index}`}
              aria-selected={active === index}
              aria-controls="market-panel"
              onClick={() => setActive(index)}
            >
              <span>{item.code}</span>
              {item.name}
            </button>
          ))}
        </div>
        <div
          id="market-panel"
          className="home-market-panel"
          role="tabpanel"
          aria-labelledby={`market-tab-${active}`}
        >
          <div className="home-market-visual" aria-hidden="true">
            <Globe2 />
            {region.modes.map((ModeIcon, index) => (
              <span key={index}>
                <ModeIcon />
              </span>
            ))}
          </div>
          <div>
            <span className="home-market-code">{region.code} / NETWORK</span>
            <h3>{region.title}</h3>
            <p>{region.text}</p>
            <div className="home-market-locations">
              {region.locations.map((location) => (
                <span key={location}>{location}</span>
              ))}
            </div>
            <Link to="/import-export" className="home-text-link">
              Explore import &amp; export services <ChevronRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SeasonalCalendar() {
  const currentMonth = new Date().getMonth();
  const [month, setMonth] = useState(currentMonth);
  const available = useMemo(
    () => seasonalGroups.filter((item) => (item.months as readonly number[]).includes(month)),
    [month],
  );
  return (
    <section className="home-seasonal" aria-labelledby="seasonal-title">
      <div className="home-section-shell">
        <SectionIntro
          eyebrow="Plan ahead"
          title="Seasonal availability"
          text="A planning guide for key fresh products. Final availability depends on origin, grade and crop conditions."
        />
        <div className="home-month-picker" aria-label="Choose a month">
          {monthNames.map((name, index) => (
            <button
              key={name}
              type="button"
              className={month === index ? "is-active" : ""}
              aria-pressed={month === index}
              onClick={() => setMonth(index)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="home-seasonal-result" aria-live="polite">
          <div>
            <CalendarDays aria-hidden="true" />
            <span>
              Available in <strong>{monthNames[month]}</strong>
            </span>
          </div>
          <ul>
            {available.map((item) => (
              <li key={item.name}>
                <Leaf aria-hidden="true" />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.note}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function PackagingShowcase() {
  return (
    <section className="home-packaging" aria-labelledby="packaging-title">
      <div className="home-section-shell home-packaging-grid">
        <div className="home-packaging-photo">
          <SmartImage
            src={businessWarehouse}
            alt="Export products prepared in flexible bulk packaging formats"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
          />
          <span>Custom branding available</span>
        </div>
        <div>
          <SectionIntro
            eyebrow="Packed for your market"
            title="Packaging options"
            text="Choose a proven format or brief us on your buyer, shelf and handling requirements."
          />
          <div className="home-packaging-list">
            {packaging.map(({ icon: Icon, title, size, text }) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>
                    {title}
                    <span>{size}</span>
                  </h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
          <Link to="/request-quote" className="btn-primary">
            Discuss your packaging
          </Link>
        </div>
      </div>
    </section>
  );
}

export function QualityGallery() {
  const [active, setActive] = useState(0);
  const selected = qualityGallery[active]!;
  return (
    <section className="home-quality" aria-labelledby="quality-title">
      <div className="home-section-shell">
        <SectionIntro
          eyebrow="Quality in practice"
          title="Control at every handoff"
          text="A clear inspection trail protects product quality from supplier approval through loading."
        />
        <div className="home-quality-gallery">
          <div className="home-quality-feature">
            <SmartImage
              src={selected.image}
              alt={selected.title}
              width={1200}
              height={800}
              className="h-full w-full object-cover"
            />
            <div>
              <span>0{active + 1}</span>
              <h3>{selected.title}</h3>
              <p>{selected.text}</p>
            </div>
          </div>
          <div className="home-quality-thumbs">
            {qualityGallery.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={active === index ? "is-active" : ""}
                aria-pressed={active === index}
                onClick={() => setActive(index)}
              >
                <SmartImage
                  src={item.image}
                  alt=""
                  width={320}
                  height={240}
                  className="h-full w-full object-cover"
                />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
        <Link to="/quality" className="home-text-link">
          Explore quality assurance <ChevronRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function HomeFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="home-faq" aria-labelledby="faq-title">
      <div className="home-section-shell home-faq-grid">
        <div>
          <SectionIntro
            eyebrow="Buyer questions"
            title="Useful answers before you enquire"
            text="If your requirement is more specific, our trade desk can review it directly."
          />
          <Link to="/contact" className="home-text-link">
            Ask another question <ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <div className="home-faq-list">
          {faqs.map((item, index) => (
            <article key={item.question} className={open === index ? "is-open" : ""}>
              <h3>
                <button
                  type="button"
                  aria-expanded={open === index}
                  onClick={() => setOpen(open === index ? -1 : index)}
                >
                  {item.question}
                  <span>{open === index ? "−" : "+"}</span>
                </button>
              </h3>
              {open === index && <p>{item.answer}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalQuoteCta() {
  return (
    <section className="home-final-cta">
      <SmartImage
        src={businessPort}
        alt="International food cargo prepared for global shipment"
        width={1920}
        height={900}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="home-final-cta-overlay" />
      <div className="home-section-shell">
        <span>Ready to source with confidence?</span>
        <h2>
          Tell us what you need.
          <br />
          <em>We’ll map the route.</em>
        </h2>
        <p>
          Share the product, quantity, packaging and destination. Our trade desk will respond with
          the next practical step.
        </p>
        <div>
          <Link to="/request-quote" className="btn-accent">
            Request a quote <ChevronRight aria-hidden="true" />
          </Link>
          <Link to="/contact" className="btn-outline-light">
            Talk to our team
          </Link>
        </div>
      </div>
    </section>
  );
}
