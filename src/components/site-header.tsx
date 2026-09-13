import { Link } from "@tanstack/react-router";
import { Menu, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { contact } from "@/data/catalog";
import logo from "@/assets/logo-leo-infinity.png";

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
          <a
            href={`mailto:${contact.email}`}
            className="hidden transition-colors hover:text-cream sm:inline"
          >
            Email: {contact.email}
          </a>
        </div>
        <span className="tracking-widest uppercase">EN / AR / ES</span>
      </div>

      {/* Main nav */}
      <nav className="sticky top-0 z-50 border-b border-primary/5 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-x-6 px-6 py-4 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img
              src={logo}
              alt="Leo Infinity Global General Trading logo"
              width={1024}
              height={1024}
              className="h-12 w-12 object-contain"
            />
            <span className="font-serif text-lg leading-tight font-bold tracking-tight text-primary sm:text-xl">
              Leo Infinity<span className="text-accent">.</span>
              <span className="block text-[10px] font-medium tracking-[0.2em] text-primary/60 uppercase">
                Global General Trading
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-x-5 text-sm font-medium tracking-wider uppercase min-[1360px]:flex 2xl:gap-x-8">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="whitespace-nowrap text-primary transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/login"
              className="hidden whitespace-nowrap text-sm font-medium tracking-wider text-primary uppercase transition-colors hover:text-accent sm:inline-flex"
            >
              Portal Login
            </Link>
            <Link
              to="/request-quote"
              className="btn-accent hidden whitespace-nowrap px-5! py-2.5! text-xs! sm:inline-flex"
            >
              Request a Quote
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer text-primary min-[1360px]:hidden"
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
                to="/login"
                onClick={() => setOpen(false)}
                className="text-primary transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                Portal Login
              </Link>
              <Link
                to="/request-quote"
                onClick={() => setOpen(false)}
                className="btn-accent mt-2 py-3! text-xs!"
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
