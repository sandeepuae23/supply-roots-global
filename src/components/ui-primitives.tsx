import type { ReactNode } from "react";
import { SmartImage } from "@/components/smart-image";

export function SectionHeading({
  eyebrow,
  title,
  action,
  center,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  center?: boolean;
}) {
  if (center) {
    return (
      <div className="mb-12 text-center">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="font-serif text-4xl text-primary">{title}</h2>
      </div>
    );
  }
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="font-serif text-4xl text-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export function CheckItem({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 font-bold text-accent">✓</span>
      <span className={light ? "text-cream/80" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}

export function PageHero({
  image,
  eyebrow,
  title,
  subtitle,
}: {
  image?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-primary">
      {image && (
        <>
          <SmartImage src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-primary/70" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="max-w-3xl font-serif text-5xl leading-tight text-cream md:text-6xl">{title}</h1>
        {subtitle && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">{subtitle}</p>}
      </div>
    </section>
  );
}
