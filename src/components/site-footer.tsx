/* eslint-disable prettier/prettier */
import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { categories, contact } from "@/data/catalog";
import logo from "@/assets/logo-leo-infinity.png";
import "@/home-experience.css";

const footerMarkets = ["UAE & Gulf", "Saudi Arabia", "Qatar", "Oman", "Europe", "Africa", "Asia"];
const certificates = [
  "Phytosanitary support",
  "Certificate of origin",
  "Health & veterinary documents",
  "Laboratory reports",
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-newsletter">
        <div>
          <span>MARKET INTELLIGENCE</span>
          <h2>Product and seasonal updates for buyers</h2>
          <p>Occasional availability, crop-window and trade-lane updates from our team.</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const email = String(data.get("newsletter-email") ?? "");
            window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent("Subscribe me to product updates")}&body=${encodeURIComponent(`Please add ${email} to the Leo Infinity product update list.`)}`;
          }}
        >
          <label htmlFor="newsletter-email">Business email</label>
          <div>
            <input
              id="newsletter-email"
              name="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="buyer@company.com"
            />
            <button type="submit" aria-label="Request product updates">
              <Send aria-hidden="true" />
            </button>
          </div>
          <small>Your email app will open so you can confirm the request.</small>
        </form>
      </div>

      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">
            <img src={logo} alt="" width={1024} height={1024} loading="lazy" />
            <span>
              Leo Infinity<strong>Global General Trading</strong>
            </span>
          </Link>
          <p>
            International sourcing, importing and exporting of quality agricultural and food
            products for business buyers.
          </p>
          <Link to="/request-quote" className="site-footer-quote">
            Start an enquiry
          </Link>
        </div>

        <div>
          <h3>Products</h3>
          <ul>
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <a href={`/products?category=${category.slug}`}>
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Markets</h3>
          <ul>
            {footerMarkets.map((market) => (
              <li key={market}>
                <Link to="/" hash="global-markets">
                  {market}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Quality support</h3>
          <ul>
            {certificates.map((item) => (
              <li key={item}>
                <Link to="/quality">{item}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-contact">
          <h3>Contact</h3>
          <address>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" />
              {contact.phone}
            </a>
            <a href={`mailto:${contact.email}`}>
              <Mail aria-hidden="true" />
              {contact.email}
            </a>
            <a href={contact.whatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              WhatsApp our trade desk
            </a>
            <p>{contact.address}</p>
          </address>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>
          © {new Date().getFullYear()} {contact.company}. All rights reserved.
        </p>
        <nav aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/import-export">Trade services</Link>
          <Link to="/business-clients">Business clients</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
