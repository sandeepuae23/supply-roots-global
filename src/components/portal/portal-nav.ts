/**
 * Navigation registry for the three protected portals. Phase 1 wires only the
 * screens that exist (dashboard, and the admin account-control screens); the
 * remaining workspaces from the roadmap route plan (§12) are declared as
 * `upcoming` so the shells show the full information architecture without
 * linking to unbuilt routes.
 */

import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

export interface PortalNavItem {
  label: string;
  /** Target route path. */
  to: string;
  icon: LucideIcon;
  /** When true, the item is declared but not yet routable (Phase 2+). */
  upcoming?: boolean;
}

export interface PortalConfig {
  key: "admin" | "buyer" | "vendor";
  label: string;
  home: string;
  nav: PortalNavItem[];
}

export const ADMIN_PORTAL: PortalConfig = {
  key: "admin",
  label: "Administrator",
  home: "/admin/dashboard",
  nav: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Buyers", to: "/admin/buyers", icon: Building2, upcoming: true },
    { label: "Vendors", to: "/admin/vendors", icon: Truck, upcoming: true },
    { label: "Products", to: "/admin/products", icon: Package, upcoming: true },
    { label: "Enquiries", to: "/admin/enquiries", icon: ClipboardList, upcoming: true },
    { label: "Orders", to: "/admin/orders", icon: ShoppingCart, upcoming: true },
    { label: "Documents", to: "/admin/documents", icon: FileText, upcoming: true },
    { label: "Audit", to: "/admin/audit", icon: ShieldCheck, upcoming: true },
    { label: "Settings", to: "/admin/settings", icon: Settings, upcoming: true },
  ],
};

export const BUYER_PORTAL: PortalConfig = {
  key: "buyer",
  label: "Business Client",
  home: "/buyer/dashboard",
  nav: [
    { label: "Dashboard", to: "/buyer/dashboard", icon: LayoutDashboard },
    { label: "Company", to: "/buyer/company", icon: Building2, upcoming: true },
    { label: "Products", to: "/buyer/products", icon: Package, upcoming: true },
    { label: "Enquiries", to: "/buyer/enquiries", icon: ClipboardList, upcoming: true },
    { label: "Quotes", to: "/buyer/quotes", icon: FileText, upcoming: true },
    { label: "Orders", to: "/buyer/orders", icon: ShoppingCart, upcoming: true },
    { label: "Shipments", to: "/buyer/shipments", icon: Ship, upcoming: true },
    { label: "Invoices", to: "/buyer/invoices", icon: Receipt, upcoming: true },
    { label: "Messages", to: "/buyer/messages", icon: MessageSquare, upcoming: true },
    { label: "Settings", to: "/buyer/settings", icon: Settings, upcoming: true },
  ],
};

export const VENDOR_PORTAL: PortalConfig = {
  key: "vendor",
  label: "Vendor",
  home: "/vendor/dashboard",
  nav: [
    { label: "Dashboard", to: "/vendor/dashboard", icon: LayoutDashboard },
    { label: "Company", to: "/vendor/company", icon: Building2, upcoming: true },
    { label: "Products", to: "/vendor/products", icon: Package, upcoming: true },
    { label: "Availability", to: "/vendor/availability", icon: Boxes, upcoming: true },
    { label: "Opportunities", to: "/vendor/opportunities", icon: Gauge, upcoming: true },
    { label: "Offers", to: "/vendor/offers", icon: FileText, upcoming: true },
    { label: "Orders", to: "/vendor/orders", icon: ShoppingCart, upcoming: true },
    { label: "Shipments", to: "/vendor/shipments", icon: Ship, upcoming: true },
    { label: "Invoices", to: "/vendor/invoices", icon: Receipt, upcoming: true },
    { label: "Settings", to: "/vendor/settings", icon: Settings, upcoming: true },
  ],
};
