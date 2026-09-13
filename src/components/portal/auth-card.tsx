/**
 * Centered card shell for unauthenticated portal screens (login, registration,
 * account status, forced password change). Preserves the "Earth and Industry"
 * brand: forest-green field backdrop, cream card, Playfair display type.
 */

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-leo-infinity.png";
import { cn } from "@/lib/utils";

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  width = "md",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Card max width — `lg` for multi-column registration forms. */
  width?: "md" | "lg";
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4 py-16">
      <div className="deep-panel absolute inset-0" aria-hidden="true" />
      <div
        className={cn(
          "relative w-full rounded-sm border border-border bg-card p-8 shadow-lg sm:p-10",
          width === "lg" ? "max-w-3xl" : "max-w-md",
        )}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-3"
            aria-label="Leo Infinity — home"
          >
            <img
              src={logo}
              alt="Leo Infinity Global General Trading logo"
              width={1024}
              height={1024}
              className="h-12 w-12 object-contain"
            />
            <span className="font-serif text-lg leading-tight font-bold tracking-tight text-primary">
              Leo Infinity<span className="text-accent">.</span>
              <span className="block text-[10px] font-medium tracking-[0.2em] text-primary/60 uppercase">
                Trade Portal
              </span>
            </span>
          </Link>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="font-serif text-3xl text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {children}

        {footer && (
          <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
