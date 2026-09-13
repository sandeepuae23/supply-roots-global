import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  type AccountStatus,
  type AdminActionName,
  type AdminActionRequest,
  type ResetPasswordResult,
} from "@/lib/api";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge, UserTypeBadge } from "@/components/portal/status-badge";
import { StateError, StateLoading, StateEmpty } from "@/components/portal/data-states";
import {
  ReasonDialog,
  type ReasonPreset,
  type ReasonSubmission,
} from "@/components/portal/reason-dialog";
import { CopyableSecret } from "@/components/portal/copyable-secret";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({ meta: [{ title: "User detail — Leo Infinity Trade Portal" }] }),
  component: AdminUserDetailPage,
});

// --- Action definitions -----------------------------------------------------

type ActionKey = AdminActionName | "reset_password";

interface ActionDef {
  key: ActionKey;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  presets?: ReasonPreset[];
  buttonVariant?: "default" | "outline" | "destructive" | "secondary";
}

const APPROVE_PRESETS: ReasonPreset[] = [
  { value: "REGISTRATION_VERIFIED", label: "Registration verified" },
  { value: "DOCUMENTS_CONFIRMED", label: "Company documents confirmed" },
];

const ACTIONS: Record<ActionKey, ActionDef> = {
  approve: {
    key: "approve",
    label: "Approve",
    title: "Approve account",
    description: "Activate this account so the user can sign in.",
    confirmLabel: "Approve",
    presets: APPROVE_PRESETS,
    buttonVariant: "default",
  },
  reject: {
    key: "reject",
    label: "Reject",
    title: "Reject registration",
    description: "Reject this registration. This is a terminal state and cannot be undone here.",
    confirmLabel: "Reject",
    destructive: true,
    buttonVariant: "destructive",
  },
  lock: {
    key: "lock",
    label: "Lock",
    title: "Lock account",
    description: "Manually lock this active account. The user will be blocked until unlocked.",
    confirmLabel: "Lock account",
    buttonVariant: "outline",
  },
  unlock: {
    key: "unlock",
    label: "Unlock",
    title: "Unlock account",
    description: "Unlock this account and restore it to active.",
    confirmLabel: "Unlock",
    buttonVariant: "default",
  },
  suspend: {
    key: "suspend",
    label: "Suspend",
    title: "Suspend account",
    description: "Temporarily suspend this active account.",
    confirmLabel: "Suspend",
    buttonVariant: "outline",
  },
  reactivate: {
    key: "reactivate",
    label: "Reactivate",
    title: "Reactivate account",
    description: "Restore this suspended account to active.",
    confirmLabel: "Reactivate",
    buttonVariant: "default",
  },
  disable: {
    key: "disable",
    label: "Disable",
    title: "Disable account",
    description: "Permanently disable this account. This is a terminal state.",
    confirmLabel: "Disable",
    destructive: true,
    buttonVariant: "destructive",
  },
  reset_password: {
    key: "reset_password",
    label: "Reset password",
    title: "Reset password",
    description:
      "Generate a one-time temporary password. This does not approve, unlock or reactivate the account; the user must change the password at next sign-in.",
    confirmLabel: "Reset password",
    buttonVariant: "outline",
  },
};

const ACTION_SUCCESS_MESSAGE: Record<AdminActionName, string> = {
  approve: "Account approved",
  reject: "Registration rejected",
  lock: "Account locked",
  unlock: "Account unlocked",
  suspend: "Account suspended",
  reactivate: "Account reactivated",
  disable: "Account disabled",
};

/** Actions available for a given account status (roadmap §5). */
function availableActions(status: AccountStatus): ActionDef[] {
  switch (status) {
    case "PENDING_APPROVAL":
      return [ACTIONS.approve, ACTIONS.reject];
    case "ACTIVE":
      return [ACTIONS.lock, ACTIONS.suspend, ACTIONS.disable, ACTIONS.reset_password];
    case "LOCKED":
      return [ACTIONS.unlock, ACTIONS.disable, ACTIONS.reset_password];
    case "SUSPENDED":
      return [ACTIONS.reactivate, ACTIONS.disable, ACTIONS.reset_password];
    case "REJECTED":
    case "DISABLED":
      return [];
  }
}

// --- Presentation helpers ---------------------------------------------------

/**
 * One label/value row.
 *
 * Renders nothing when the value is absent. Several fields are structurally
 * empty for a given account — an administrator never has a company, an active
 * account never has a suspension reason — and printing a row of em-dashes for
 * them fills the card with placeholders that carry no information. Pass
 * `alwaysShow` for fields whose emptiness is itself meaningful.
 */
function DetailRow({
  label,
  value,
  alwaysShow = false,
}: {
  label: string;
  value: ReactNode;
  alwaysShow?: boolean;
}) {
  const isEmpty = value === null || value === undefined || value === "" || value === "—";
  if (isEmpty && !alwaysShow) return null;

  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm text-foreground sm:text-right">{isEmpty ? "—" : value}</dd>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

// --- Page -------------------------------------------------------------------

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();

  const [activeAction, setActiveAction] = useState<ActionDef | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  const userQuery = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: ({ signal }) => adminApi.getUser(userId, signal),
  });

  const historyQuery = useQuery({
    queryKey: ["admin", "user", userId, "status-history"],
    queryFn: ({ signal }) => adminApi.getStatusHistory(userId, {}, signal),
  });

  const attemptsQuery = useQuery({
    queryKey: ["admin", "user", userId, "login-attempts"],
    queryFn: ({ signal }) => adminApi.getLoginAttempts(userId, {}, signal),
  });

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "account-summary"] });
  };

  const lifecycleMutation = useMutation({
    mutationFn: ({ action, payload }: { action: AdminActionName; payload: AdminActionRequest }) =>
      adminApi.performUserAction(userId, action, payload),
    onSuccess: (_result, variables) => {
      toast.success(ACTION_SUCCESS_MESSAGE[variables.action]);
      setActiveAction(null);
      invalidateUser();
    },
  });

  const resetMutation = useMutation({
    mutationFn: (payload: AdminActionRequest) => adminApi.resetPassword(userId, payload),
    onSuccess: (result) => {
      setResetResult(result);
      setActiveAction(null);
      invalidateUser();
    },
  });

  const submitting = lifecycleMutation.isPending || resetMutation.isPending;
  const activeError = lifecycleMutation.error ?? resetMutation.error;

  const handleSubmit = (submission: ReasonSubmission) => {
    if (!activeAction) return;
    const payload: AdminActionRequest = {
      reason: submission.reason,
      ...(submission.notes ? { notes: submission.notes } : {}),
    };
    if (activeAction.key === "reset_password") {
      resetMutation.mutate(payload);
    } else {
      lifecycleMutation.mutate({ action: activeAction.key, payload });
    }
  };

  const openAction = (def: ActionDef) => {
    lifecycleMutation.reset();
    resetMutation.reset();
    setActiveAction(def);
  };

  return (
    <div>
      <Link
        to="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to users
      </Link>

      {userQuery.isPending ? (
        <StateLoading label="Loading user…" />
      ) : userQuery.isError ? (
        <StateError error={userQuery.error} onRetry={() => userQuery.refetch()} />
      ) : (
        <>
          <PageHeader
            title={userQuery.data.username}
            description={userQuery.data.email}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <UserTypeBadge userType={userQuery.data.user_type} />
                <StatusBadge status={userQuery.data.status} />
              </div>
            }
          />

          {/* Action bar */}
          {availableActions(userQuery.data.status).length > 0 ? (
            <div
              className="mb-6 flex flex-wrap gap-2 rounded-sm border border-border bg-card p-3"
              role="group"
              aria-label="Account actions"
            >
              {availableActions(userQuery.data.status).map((def) => (
                // Destructive actions are rendered recessive, not as a solid red
                // fill. Filled red made "Disable" the loudest element on the
                // screen — louder than the account name — which is backwards for
                // the action you least want taken by reflex. The confirmation
                // dialog is where the weight belongs.
                <Button
                  key={def.key}
                  variant={
                    def.buttonVariant === "destructive"
                      ? "outline"
                      : (def.buttonVariant ?? "outline")
                  }
                  onClick={() => openAction(def)}
                  className={
                    def.buttonVariant === "destructive"
                      ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      : undefined
                  }
                >
                  {def.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mb-6 rounded-sm border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              This account is in a terminal state ({userQuery.data.status}). No further actions are
              available.
            </p>
          )}

          {/* Details sit above activity rather than beside it. Side by side, a
              short fixed list and a long scrolling log are never the same
              height, which left a ragged column and a band of dead space. */}
          <div className="grid grid-cols-1 gap-6">
            {/* Account details */}
            <section aria-label="Account details">
              <h2 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Account details
              </h2>
              {/* Two columns at width: a single stack of label-left/value-right
                  rows across the full container leaves the pair marooned at
                  opposite edges. */}
              <dl className="grid grid-cols-1 rounded-sm border border-border bg-card px-4 sm:grid-cols-2 sm:gap-x-10 sm:px-5">
                {/* Company, roles and suspension reason are omitted when empty
                    rather than shown as em-dashes — see DetailRow. "Last login"
                    is always shown because "never signed in" is worth stating.
                    Company is structurally inapplicable to an administrator, so
                    it is dropped entirely for that user type. */}
                {userQuery.data.user_type !== "ADMIN" && (
                  <DetailRow label="Company" value={userQuery.data.company_name} />
                )}
                <DetailRow label="Roles" value={userQuery.data.roles.join(", ")} />
                <DetailRow label="Failed logins" value={userQuery.data.failed_login_attempts} />
                <DetailRow
                  label="Last login"
                  value={formatDateTime(userQuery.data.last_login_at)}
                  alwaysShow
                />
                <DetailRow label="Approved" value={formatDateTime(userQuery.data.approved_at)} />
                <DetailRow
                  label="Must change password"
                  value={userQuery.data.must_change_password ? "Yes" : "No"}
                />
                <DetailRow label="Suspension reason" value={userQuery.data.suspension_reason} />
                <DetailRow label="Registered" value={formatDateTime(userQuery.data.created_at)} />
              </dl>
            </section>

            {/* History + attempts */}
            <section aria-label="Activity">
              <Tabs defaultValue="history">
                <TabsList>
                  <TabsTrigger value="history">Status history</TabsTrigger>
                  <TabsTrigger value="attempts">Login attempts</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                  {historyQuery.isPending ? (
                    <StateLoading label="Loading history…" />
                  ) : historyQuery.isError ? (
                    <StateError error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
                  ) : historyQuery.data.items.length === 0 ? (
                    <StateEmpty title="No status history" />
                  ) : (
                    <ol className="space-y-3">
                      {historyQuery.data.items.map((entry) => (
                        <li key={entry.id} className="rounded-sm border border-border bg-card p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.previous_status && (
                              <>
                                <StatusBadge status={entry.previous_status} />
                                <span aria-hidden="true" className="text-muted-foreground">
                                  →
                                </span>
                              </>
                            )}
                            <StatusBadge status={entry.new_status} />
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatDateTime(entry.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{entry.reason}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.actor_type}
                            {entry.request_id ? ` · req ${entry.request_id}` : ""}
                            {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>

                <TabsContent value="attempts">
                  {attemptsQuery.isPending ? (
                    <StateLoading label="Loading login attempts…" />
                  ) : attemptsQuery.isError ? (
                    <StateError
                      error={attemptsQuery.error}
                      onRetry={() => attemptsQuery.refetch()}
                    />
                  ) : attemptsQuery.data.items.length === 0 ? (
                    <StateEmpty title="No login attempts recorded" />
                  ) : (
                    <ol className="space-y-2">
                      {attemptsQuery.data.items.map((attempt) => (
                        <li
                          key={attempt.id}
                          className="flex items-start gap-3 rounded-sm border border-border bg-card p-3"
                        >
                          {attempt.successful ? (
                            <CheckCircle2
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-label="Successful"
                            />
                          ) : (
                            <XCircle
                              className="mt-0.5 size-4 shrink-0 text-destructive"
                              aria-label="Failed"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">
                              {attempt.successful ? "Successful sign-in" : "Failed attempt"}
                              {attempt.failure_reason && attempt.failure_reason !== "NONE"
                                ? ` — ${attempt.failure_reason}`
                                : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(attempt.created_at)}
                              {attempt.ip_address ? ` · ${attempt.ip_address}` : ""}
                            </p>
                            {attempt.user_agent && (
                              <p className="truncate text-xs text-muted-foreground/70">
                                {attempt.user_agent}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </>
      )}

      {/* Reason dialog for the active action */}
      {activeAction && (
        <ReasonDialog
          open={!!activeAction}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          title={activeAction.title}
          description={activeAction.description}
          confirmLabel={activeAction.confirmLabel}
          destructive={activeAction.destructive ?? false}
          {...(activeAction.presets ? { presets: activeAction.presets } : {})}
          submitting={submitting}
          error={activeError}
          onSubmit={handleSubmit}
        />
      )}

      {/* One-time temporary password result */}
      <Dialog
        open={!!resetResult}
        onOpenChange={(open) => {
          if (!open) setResetResult(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password generated</DialogTitle>
            <DialogDescription>
              Share this securely with the user. It is shown only once and expires
              {resetResult
                ? ` on ${formatDateTime(resetResult.temporary_password_expires_at)}`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          {resetResult && (
            <div className="py-2">
              <CopyableSecret value={resetResult.temporary_password} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
