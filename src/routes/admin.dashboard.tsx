import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Clock,
  Lock,
  PauseCircle,
  ShoppingBag,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { PageHeader } from "@/components/portal/page-header";
import { StatCard } from "@/components/portal/stat-card";
import { StateError, StateLoading } from "@/components/portal/data-states";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin dashboard — Leo Infinity Trade Portal" }] }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin", "account-summary"],
    queryFn: ({ signal }) => adminApi.getAccountSummary(signal),
  });

  return (
    <div>
      <PageHeader
        title="Account overview"
        description="A summary of registrations and account states across the portal."
      />

      {isPending ? (
        <StateLoading label="Loading account summary…" />
      ) : isError ? (
        <StateError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <section aria-label="Approval queue" className="mb-8">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Needs attention
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link to="/admin/users" search={{ status: "PENDING_APPROVAL" }} className="block">
                <StatCard
                  label="Pending approval"
                  value={data.pending_approval}
                  icon={Clock}
                  tone="accent"
                  hint="Awaiting administrator review"
                />
              </Link>
              <Link to="/admin/users" search={{ status: "LOCKED" }} className="block">
                <StatCard label="Locked" value={data.locked} icon={Lock} tone="danger" />
              </Link>
              <Link to="/admin/users" search={{ status: "SUSPENDED" }} className="block">
                <StatCard
                  label="Suspended"
                  value={data.suspended}
                  icon={PauseCircle}
                  tone="accent"
                />
              </Link>
            </div>
          </section>

          <section aria-label="Account totals" className="mb-8">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Accounts
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total users" value={data.total_users} icon={Users} tone="primary" />
              <StatCard label="Active" value={data.active} icon={UserCheck} tone="primary" />
              <StatCard label="Rejected" value={data.rejected} icon={XCircle} />
              <StatCard label="Disabled" value={data.disabled} icon={Ban} />
            </div>
          </section>

          <section aria-label="By account type">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              By type
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link to="/admin/users" search={{ user_type: "BUYER" }} className="block">
                <StatCard label="Buyers" value={data.buyers} icon={ShoppingBag} />
              </Link>
              <Link to="/admin/users" search={{ user_type: "VENDOR" }} className="block">
                <StatCard label="Vendors" value={data.vendors} icon={Truck} />
              </Link>
              <Link to="/admin/users" search={{ user_type: "ADMIN" }} className="block">
                <StatCard label="Admins" value={data.admins} icon={Users} />
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {data.registered_last_7_days} new registration
              {data.registered_last_7_days === 1 ? "" : "s"} in the last 7 days.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
