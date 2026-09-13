import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/portal-layout";
import { VENDOR_PORTAL } from "@/components/portal/portal-nav";

export const Route = createFileRoute("/vendor")({
  component: VendorLayout,
});

function VendorLayout() {
  return (
    <PortalLayout config={VENDOR_PORTAL} userType="VENDOR">
      <Outlet />
    </PortalLayout>
  );
}
