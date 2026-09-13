import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/portal-layout";
import { ADMIN_PORTAL } from "@/components/portal/portal-nav";
import { ADMIN_ROLES } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <PortalLayout config={ADMIN_PORTAL} userType="ADMIN" requiredRoles={ADMIN_ROLES}>
      <Outlet />
    </PortalLayout>
  );
}
