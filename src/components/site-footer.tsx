import { Link } from "@tanstack/react-router";
import { categories, contact, markets } from "@/data/catalog";
import logo from "@/assets/logo-leo-infinity.png";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Leo Infinity Global General Trading logo"
              width={1024}
              height={1024}
              loading="lazy"
              className="h-12 w-12 object-contain brightness-0 invert"
            />
            <span className="font-serif text-xl leading-tight font-bold tracking-tight">
              Leo Infinity<span className="text-accent">.</span>
              <span className="block text-[10px] font-medium tracking-[0.2em] text-cream/60 uppercase">
                Global General Trading
              </span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-cream/70">
            Licensed international food trading company sourcing, importing and exporting quality agricultural and
            food products worldwide.
          </p>
        </div>

        <div>
          <h5 className="mb-4 text-xs font-bold tracking-widest text-cream/50 uppercase">Company</h5>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about" className="text-cream/80 transition-colors hover:text-accent">About Us</Link></li>
            <li><Link to="/import-export" className="text-cream/80 transition-colors hover:text-accent">Import & Export</Link></li>
            <li><Link to="/business-clients" className="text-cream/80 transition-colors hover:text-accent">Business Clients</Link></li>
            <li><Link to="/quality" className="text-cream/80 transition-colors hover:text-accent">Quality & Certifications</Link></li>
            <li><Link to="/contact" className="text-cream/80 transition-colors hover:text-accent">Contact Us</Link></li>
            <li><Link to="/request-quote" className="text-cream/80 transition-colors hover:text-accent">Request a Quote</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="mb-4 text-xs font-bold tracking-widest text-cream/50 uppercase">Products</h5>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to="/products" hash={c.slug} className="text-cream/80 transition-colors hover:text-accent">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="mb-4 text-xs font-bold tracking-widest text-cream/50 uppercase">Head Office</h5>
          <address className="space-y-2.5 text-sm leading-relaxed text-cream/80 not-italic">
            <p>{contact.address}</p>
            <p>{contact.phone}</p>
            <p>
              <a href={`mailto:${contact.email}`} className="transition-colors hover:text-accent">
                {contact.email}
              </a>
            </p>
            <p className="text-cream/60">{contact.hours}</p>
          </address>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-bold tracking-widest text-cream/60 uppercase">
            {markets.map((m, i) => (
              <span key={m} className="inline-flex items-center gap-3">
                {i > 0 && <span className="text-accent">•</span>}
                {m}
              </span>
            ))}
          </div>
          <p className="text-xs text-cream/50">
            © {new Date().getFullYear()} {contact.company}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
