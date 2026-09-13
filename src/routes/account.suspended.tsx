import { createFileRoute } from "@tanstack/react-router";
import { AccountStatusScreen } from "@/components/portal/account-status-screen";
import { ACCOUNT_STATUS_META } from "@/lib/auth/account-status";

export const Route = createFileRoute("/account/suspended")({
  head: () => ({ meta: [{ title: "Account suspended — Leo Infinity Trade Portal" }] }),
  component: () => <AccountStatusScreen meta={ACCOUNT_STATUS_META.SUSPENDED} />,
});
