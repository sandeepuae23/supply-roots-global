import { Link } from "@tanstack/react-router";
import { Menu, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { contact } from "@/data/catalog";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/products", label: "Products" },
  { to: "/import-export", label: "Import & Export" },
  { to: "/business-clients", label: "Business Clients" },
  { to: "/quality", label: "Quality" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-cream/10 bg-primary px-6 py-2 text-xs text-cream/80">
        <div className="flex gap-6">
          <a
            href={contact.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-cream"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp: {contact.whatsapp}
          </a>
          <a href={`mailto:${contact.email}`} className="hidden transition-colors hover:text-cream sm:inline">
            Email: {contact.email}
          </a>
        </div>
        <span className="tracking-widest uppercase">EN / AR / ES</span>
      </div>

      {/* Main nav */}
      <nav className="sticky top-0 z-50 border-b border-primary/5 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-primary">
            GlobalTerra<span className="text-accent">.</span>
          </Link>

          <div className="hidden gap-7 text-sm font-medium tracking-wider uppercase lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="text-primary transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/request-quote" className="btn-accent hidden !px-5 !py-2.5 !text-xs sm:inline-flex">
              Request a Quote
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer text-primary lg:hidden"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-primary/10 bg-cream px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-4 text-sm font-medium tracking-wider uppercase">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  onClick={() => setOpen(false)}
                  className="text-primary transition-colors hover:text-accent"
                  activeProps={{ className: "text-accent" }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/request-quote"
                onClick={() => setOpen(false)}
                className="btn-accent mt-2 !py-3 !text-xs"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
