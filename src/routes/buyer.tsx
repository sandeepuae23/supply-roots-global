import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/portal-layout";
import { BUYER_PORTAL } from "@/components/portal/portal-nav";

export const Route = createFileRoute("/buyer")({
  component: BuyerLayout,
});

function BuyerLayout() {
  return (
    <PortalLayout config={BUYER_PORTAL} userType="BUYER">
      <Outlet />
    </PortalLayout>
  );
}
