import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import {
  ACCOUNT_STATUSES,
  USER_TYPES,
  adminApi,
  type AccountStatus,
  type AdminUserListParams,
  type UserType,
} from "@/lib/api";
import { PageHeader } from "@/components/portal/page-header";
import {
  StatusBadge,
  UserTypeBadge,
  STATUS_LABEL,
  USER_TYPE_LABEL,
} from "@/components/portal/status-badge";
import { StateEmpty, StateError, StateLoading } from "@/components/portal/data-states";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

interface UserSearch {
  query?: string | undefined;
  user_type?: UserType | undefined;
  status?: AccountStatus | undefined;
  company?: string | undefined;
  page?: number | undefined;
}

function parseUserType(value: unknown): UserType | undefined {
  return typeof value === "string" && (USER_TYPES as string[]).includes(value)
    ? (value as UserType)
    : undefined;
}

function parseStatus(value: unknown): AccountStatus | undefined {
  return typeof value === "string" && (ACCOUNT_STATUSES as string[]).includes(value)
    ? (value as AccountStatus)
    : undefined;
}

export const Route = createFileRoute("/admin/users/")({
  head: () => ({ meta: [{ title: "Users — Leo Infinity Trade Portal" }] }),
  validateSearch: (search: Record<string, unknown>): UserSearch => {
    const rawQuery = search["query"];
    const rawCompany = search["company"];
    const page = Number(search["page"]);
    return {
      query: typeof rawQuery === "string" && rawQuery ? rawQuery : undefined,
      user_type: parseUserType(search["user_type"]),
      status: parseStatus(search["status"]),
      company: typeof rawCompany === "string" && rawCompany ? rawCompany : undefined,
      page: Number.isFinite(page) && page > 1 ? page : undefined,
    };
  },
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Local state for free-text inputs; selects/pagination commit to the URL directly.
  const [queryInput, setQueryInput] = useState(search.query ?? "");
  const [companyInput, setCompanyInput] = useState(search.company ?? "");

  useEffect(() => {
    setQueryInput(search.query ?? "");
    setCompanyInput(search.company ?? "");
  }, [search.query, search.company]);

  const params: AdminUserListParams = {
    ...(search.query ? { query: search.query } : {}),
    ...(search.user_type ? { user_type: search.user_type } : {}),
    ...(search.status ? { status: search.status } : {}),
    ...(search.company ? { company: search.company } : {}),
    page: search.page ?? 1,
    page_size: PAGE_SIZE,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: ({ signal }) => adminApi.listUsers(params, signal),
    placeholderData: keepPreviousData,
  });

  const updateSearch = (patch: Partial<UserSearch>) => {
    navigate({
      to: "/admin/users",
      search: (prev) => {
        const next = { ...prev, ...patch };
        // Any filter change resets pagination.
        if (!("page" in patch)) next.page = undefined;
        return next;
      },
    });
  };

  const onSubmitText = (e: FormEvent) => {
    e.preventDefault();
    updateSearch({
      query: queryInput.trim() || undefined,
      company: companyInput.trim() || undefined,
    });
  };

  const hasFilters = !!search.query || !!search.user_type || !!search.status || !!search.company;

  const clearFilters = () => {
    setQueryInput("");
    setCompanyInput("");
    navigate({ to: "/admin/users", search: {} });
  };

  const page = search.page ?? 1;
  const totalItems = data?.meta.total_items ?? 0;
  const totalPages = data ? Math.max(1, data.meta.total_pages) : 1;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search and filter buyer, vendor and administrator accounts."
      />

      {/* Filters */}
      <form
        onSubmit={onSubmitText}
        className="mb-6 grid grid-cols-1 gap-3 rounded-sm border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
        role="search"
        aria-label="User filters"
      >
        <label className="lg:col-span-2">
          <span className="field-label">Username / email</span>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search by username or email"
              className="field-input pl-9"
            />
          </div>
        </label>

        <label>
          <span className="field-label">Company</span>
          <input
            type="search"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            placeholder="Company name"
            className="field-input mt-2"
          />
        </label>

        <label>
          <span className="field-label">User type</span>
          <select
            value={search.user_type ?? ""}
            onChange={(e) => updateSearch({ user_type: parseUserType(e.target.value) })}
            className="field-select mt-2"
          >
            <option value="">All types</option>
            {USER_TYPES.map((t) => (
              <option key={t} value={t}>
                {USER_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Status</span>
          <select
            value={search.status ?? ""}
            onChange={(e) => updateSearch({ status: parseStatus(e.target.value) })}
            className="field-select mt-2"
          >
            <option value="">All statuses</option>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit">
            <Search className="size-4" aria-hidden="true" />
            Search
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
      </form>

      {/* Results */}
      {isPending ? (
        <StateLoading label="Loading users…" />
      ) : isError ? (
        <StateError error={error} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <StateEmpty
          title="No users match"
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "No accounts have been created yet."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className="overflow-x-auto rounded-sm border border-border bg-card"
            aria-busy={isFetching}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Failed logins</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="sr-only">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <UserTypeBadge userType={u.user_type} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.company_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.failed_login_attempts}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: u.id }}
                        className="text-sm font-semibold text-accent hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {totalItems} user{totalItems === 1 ? "" : "s"} · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateSearch({ page: page - 1 <= 1 ? undefined : page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateSearch({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
