/* eslint-disable prettier/prettier */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Download, MessageCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmartImage } from "@/components/smart-image";
import { categories, contact, products, productsByCategory, type Product } from "@/data/catalog";
import {
  getAvailability,
  getOriginCountries,
  getPackagingGroup,
  getProductKind,
  matchesProductGroup,
  type ProductGroup,
  type ProductKind,
} from "@/lib/product-utils";
import "@/product-discovery.css";

type ProductCardProps = {
  product: Product;
  compare?: boolean;
  selected?: boolean;
  onCompare?: (product: Product) => void;
};

function ProductCard({ product, compare = false, selected = false, onCompare }: ProductCardProps) {
  const whatsapp = `${contact.whatsappLink}?text=${encodeURIComponent(`Hello, I'm interested in ${product.name}. Please share current availability, specification and pricing.`)}`;
  return (
    <article className="product-discovery-card">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="product-discovery-image">
        <SmartImage src={product.image} alt={product.name} width={800} height={600} className="h-full w-full object-cover" />
        <div className="product-hover-preview">
          <span><strong>Origin</strong>{product.origin}</span>
          <span><strong>Packaging</strong>{product.packaging}</span>
          <span><strong>Availability</strong>{getAvailability(product)}</span>
        </div>
      </Link>
      <div className="product-discovery-content">
        <div className="product-discovery-tags">
          <span>{getProductKind(product)}</span>
          {product.featured && <span>Featured</span>}
        </div>
        <h3><Link to="/products/$slug" params={{ slug: product.slug }}>{product.name}</Link></h3>
        <p>{product.origin}</p>
        <dl><div><dt>MOQ</dt><dd>{product.moq}</dd></div><div><dt>Pack</dt><dd>{product.weight}</dd></div></dl>
        {compare && (
          <button type="button" className={`product-compare-toggle ${selected ? "is-selected" : ""}`} aria-pressed={selected} onClick={() => onCompare?.(product)}>
            <span>{selected && <Check aria-hidden="true" />}</span>{selected ? "Added to compare" : "Add to compare"}
          </button>
        )}
        <div className="product-discovery-actions">
          <a href={`/request-quote?products=${product.slug}`} className="product-quick-enquiry">Quick enquiry</a>
          <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`}><MessageCircle aria-hidden="true" /> Ask on WhatsApp</a>
        </div>
        <a href="/leo-infinity-product-specifications.pdf" download className="product-spec-download"><Download aria-hidden="true" /> Download specifications</a>
      </div>
    </article>
  );
}

export function HomeProductDiscovery() {
  return (
    <section id="product-categories" className="home-product-discovery">
      <div className="home-section-shell">
        <div className="home-product-heading">
          <div><span>Our product network</span><h2>Find the right product faster</h2><p>Explore export-ready food categories, then enquire with your exact grade, pack and destination.</p></div>
          <form action="/products" method="get" className="home-product-search" role="search">
            <label htmlFor="home-product-search">Search our product catalog</label>
            <div><Search aria-hidden="true" /><input id="home-product-search" name="q" type="search" placeholder="Search rice, mango, spices…" /><button type="submit">Search <ArrowRight aria-hidden="true" /></button></div>
          </form>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => {
            const sample = productsByCategory(category.slug)[0];
            return (
              <a key={category.slug} href={`/products?category=${category.slug}`} className="home-category-card">
                <SmartImage src={category.image} alt={category.name} width={700} height={700} className="h-full w-full object-cover" />
                <div className="home-category-shade" />
                <div className="home-category-copy"><span>{category.items.length} products</span><h3>{category.name}</h3><p>{category.tagline}</p></div>
                {sample && <div className="home-category-preview"><span><strong>Typical origin</strong>{sample.origin}</span><span><strong>Pack examples</strong>{sample.weight}</span><span><strong>Supply</strong>{getAvailability(sample)}</span></div>}
                <ArrowRight className="home-category-arrow" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const spotlightGroups: { value: Exclude<ProductGroup, "all">; label: string; text: string }[] = [
  { value: "featured", label: "Featured", text: "Core export lines with detailed specifications." },
  { value: "seasonal", label: "Seasonal", text: "A planning shortlist for fresh products with time-sensitive crop windows." },
  { value: "high-demand", label: "High demand", text: "An indicative shortlist of staple and market-essential product lines." },
];

export function ProductSpotlights() {
  const [group, setGroup] = useState<Exclude<ProductGroup, "all">>("featured");
  const visible = products.filter((product) => matchesProductGroup(product, group)).slice(0, 4);
  const current = spotlightGroups.find((item) => item.value === group)!;
  return (
    <section className="home-product-spotlights">
      <div className="home-section-shell">
        <div className="home-spotlight-heading"><div><span>Buyer shortlist</span><h2>Curated product collections</h2><p>{current.text}</p><small>Seasonality and demand groupings are indicative; current supply is confirmed at quotation.</small></div><div role="tablist" aria-label="Product collections">{spotlightGroups.map((item) => <button key={item.value} type="button" role="tab" aria-selected={group === item.value} onClick={() => setGroup(item.value)}>{item.label}</button>)}</div></div>
        <div className="product-discovery-grid">{visible.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
        <Link to="/products" className="home-text-link">Browse the complete catalog <ArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

type ExplorerProps = {
  initialQuery?: string | undefined;
  initialCategory?: string | undefined;
  initialGroup?: ProductGroup | undefined;
};

export function ProductCatalogExplorer({ initialQuery = "", initialCategory = "all", initialGroup = "all" }: ExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [origin, setOrigin] = useState("all");
  const [packaging, setPackaging] = useState("all");
  const [kind, setKind] = useState<ProductKind | "all">("all");
  const [group, setGroup] = useState<ProductGroup>(initialGroup);
  const [compare, setCompare] = useState<Product[]>([]);

  const origins = useMemo(() => Array.from(new Set(products.flatMap(getOriginCountries))).sort(), []);
  const packagingGroups = useMemo(() => Array.from(new Set(products.map(getPackagingGroup))).sort(), []);
  const filtered = useMemo(() => products.filter((product) => {
    const words = `${product.name} ${product.category} ${product.origin} ${product.variety}`.toLowerCase();
    return (!query.trim() || words.includes(query.trim().toLowerCase()))
      && (category === "all" || product.category === category)
      && (origin === "all" || getOriginCountries(product).includes(origin))
      && (packaging === "all" || getPackagingGroup(product) === packaging)
      && (kind === "all" || getProductKind(product) === kind)
      && matchesProductGroup(product, group);
  }), [query, category, origin, packaging, kind, group]);

  function toggleCompare(product: Product) {
    setCompare((current) => current.some((item) => item.slug === product.slug)
      ? current.filter((item) => item.slug !== product.slug)
      : current.length < 3 ? [...current, product] : current);
  }

  const clearFilters = () => { setQuery(""); setCategory("all"); setOrigin("all"); setPackaging("all"); setKind("all"); setGroup("all"); };

  return (
    <div className="catalog-explorer">
      <div className="catalog-explorer-top">
        <div><span>Global food catalog</span><h1>Products matched to your market</h1><p>Search and compare export specifications, origins, packaging and minimum order quantities.</p></div>
        <Link to="/request-quote" className="btn-accent">Request a quote</Link>
      </div>
      <div className="catalog-filter-shell">
        <label className="catalog-search"><span>Search products</span><div><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, variety or origin" /></div></label>
        <div className="catalog-selects">
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
          <label><span>Country of origin</span><select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="all">All origins</option>{origins.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Packaging</span><select value={packaging} onChange={(event) => setPackaging(event.target.value)}><option value="all">All packaging</option>{packagingGroups.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Product type</span><select value={kind} onChange={(event) => setKind(event.target.value as ProductKind | "all")}><option value="all">Fresh, frozen & dry</option><option value="fresh">Fresh</option><option value="frozen">Frozen</option><option value="dry">Dry</option></select></label>
        </div>
        <div className="catalog-groups" role="group" aria-label="Product collection">{(["all", "featured", "seasonal", "high-demand"] as ProductGroup[]).map((value) => <button key={value} type="button" className={group === value ? "is-active" : ""} aria-pressed={group === value} onClick={() => setGroup(value)}>{value === "high-demand" ? "High demand" : value[0]!.toUpperCase() + value.slice(1)}</button>)}</div>
      </div>
      <div className="catalog-results-heading"><p><strong>{filtered.length}</strong> products found</p><button type="button" onClick={clearFilters}><X aria-hidden="true" /> Clear filters</button></div>
      {filtered.length ? <div className="product-discovery-grid catalog-product-grid">{filtered.map((product) => <ProductCard key={product.slug} product={product} compare selected={compare.some((item) => item.slug === product.slug)} onCompare={toggleCompare} />)}</div> : <div className="catalog-empty"><SlidersHorizontal aria-hidden="true" /><h2>No products match these filters</h2><p>Try a different origin, package or product type.</p><button type="button" onClick={clearFilters}>Reset filters</button></div>}
      {compare.length > 0 && (
        <div className="compare-bar">
          <div><span>{compare.length} / 3 selected</span><strong>{compare.map((item) => item.name).join(" · ")}</strong></div>
          <Dialog>
            <DialogTrigger asChild><button type="button" disabled={compare.length < 2}>Compare products</button></DialogTrigger>
            <DialogContent className="max-w-5xl! overflow-x-auto">
              <DialogHeader><DialogTitle>Product comparison</DialogTitle><DialogDescription>Compare current catalog specifications before requesting a tailored quote.</DialogDescription></DialogHeader>
              <table className="product-compare-table"><thead><tr><th>Specification</th>{compare.map((item) => <th key={item.slug}>{item.name}</th>)}</tr></thead><tbody>{[["Origin", "origin"], ["Variety", "variety"], ["Grade", "grade"], ["Packaging", "packaging"], ["MOQ", "moq"], ["Shipping", "shipping"], ["Private label", "privateLabel"]].map(([label, key]) => <tr key={label}><th>{label}</th>{compare.map((item) => <td key={item.slug}>{item[key as keyof Product] as string}</td>)}</tr>)}</tbody></table>
              <a href={`/request-quote?products=${compare.map((item) => item.slug).join(",")}`} className="btn-accent mt-3">Enquire about selected products</a>
            </DialogContent>
          </Dialog>
          <button type="button" className="compare-clear" onClick={() => setCompare([])}>Clear</button>
        </div>
      )}
    </div>
  );
}
