/**
 * Protected portal shell (Admin / Buyer / Vendor).
 *
 * Provides a responsive sidebar + top bar around the routed content and wraps
 * everything in {@link RequireAuth}. Owned as a shared layout primitive; the
 * individual portal layout routes just supply their {@link PortalConfig}.
 */

import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import type { RoleName, UserType } from "@/lib/api";
import { useAuth } from "@/lib/auth/use-auth";
import { RequireAuth } from "@/components/portal/require-auth";
import { UserTypeBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PortalConfig } from "@/components/portal/portal-nav";
import logo from "@/assets/logo-leo-infinity.png";

function SidebarNav({ config, onNavigate }: { config: PortalConfig; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label={`${config.label} navigation`}>
      {config.nav.map((item) => {
        const Icon = item.icon;
        if (item.upcoming) {
          return (
            <span
              key={item.to}
              aria-disabled="true"
              title="Available in a later phase"
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground/50"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                Soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-primary/80 transition-colors hover:bg-secondary hover:text-primary"
            activeProps={{ className: "bg-primary/10 text-primary" }}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PortalChrome({ config, children }: { config: PortalConfig; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/*
           * Mobile navigation drawer. Built on the Sheet (Radix Dialog)
           * primitive so it gets real dialog semantics for free: role="dialog"
           * + aria-modal, a focus trap, Escape-to-close, and focus RETURN to the
           * trigger button on close. `onNavigate` closes it after a link click.
           */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="cursor-pointer text-primary lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 overflow-y-auto p-4"
              aria-label={`${config.label} portal navigation`}
            >
              <SheetHeader className="mb-4 text-left">
                <SheetTitle className="font-serif text-base text-primary">
                  {config.label} portal
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate between sections of the {config.label} portal.
                </SheetDescription>
              </SheetHeader>
              <SidebarNav config={config} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to={config.home} className="flex items-center gap-2">
            <img src={logo} alt="" width={1024} height={1024} className="h-8 w-8 object-contain" />
            <span className="font-serif text-base font-bold tracking-tight text-primary">
              Leo Infinity<span className="text-accent">.</span>
            </span>
          </Link>
          <span className="hidden text-xs font-semibold tracking-widest text-muted-foreground uppercase sm:inline">
            {config.label} portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          {user && <UserTypeBadge userType={user.user_type} className="hidden sm:inline-flex" />}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card/50 p-4 lg:block">
          <div className="sticky top-20">
            <SidebarNav config={config} />
          </div>
        </aside>

        <main className={cn("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8")}>{children}</main>
      </div>
    </div>
  );
}

export function PortalLayout({
  config,
  userType,
  requiredRoles,
  children,
}: {
  config: PortalConfig;
  userType: UserType;
  requiredRoles?: readonly RoleName[];
  children: ReactNode;
}) {
  return (
    <RequireAuth userType={userType} {...(requiredRoles ? { requiredRoles } : {})}>
      <PortalChrome config={config}>{children}</PortalChrome>
    </RequireAuth>
  );
}
