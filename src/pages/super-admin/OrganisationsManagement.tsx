// src/pages/super-admin/OrganisationsManagement.tsx
import { useState, useMemo } from "react";
import {
  Building2,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ExternalLink,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useOrganisations,
  usePendingOrganisations,
  useApproveOrganisation,
  useDeleteOrganisation,
} from "@/hooks/api/useOrganisations";
import type { Organisation, OrganisationStatus } from "@/types/api.types";
import { SuperAdminPageHeader } from "./_SuperAdminPageHeader";
import { DataTableCard } from "./_DataTableCard";

const statusConfig: Record<
  OrganisationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  // active: {
  //   label: "Active",
  //   color:
  //     "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  //   icon: CheckCircle2,
  // },
  approved: {
    label: "Approved",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
    icon: Ban,
  },
  rejected: {
    label: "Rejected",
    color:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: XCircle,
  },
};

export function OrganisationsManagement() {
  const { data: orgs = [], isLoading: loadingOrgs } = useOrganisations();
  const { data: pendingOrgs = [], isLoading: loadingPending } =
    usePendingOrganisations();
  const approveOrg = useApproveOrganisation();
  const deleteOrg = useDeleteOrganisation();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Organisation | null>(null);
  const [detailTarget, setDetailTarget] = useState<Organisation | null>(null);

  const allOrgs = useMemo(() => {
    // Merge pending into all, dedup by organisationId
    const map = new Map<string, Organisation>();
    for (const o of orgs) map.set(o.organisationId, o);
    for (const o of pendingOrgs) map.set(o.organisationId, o);
    return Array.from(map.values());
  }, [orgs, pendingOrgs]);

  const filtered = useMemo(() => {
    // FIX: the OrganisationStatus type uses 'approved' / 'pending' / 'suspended'
    // / 'rejected' — there is no 'active' value. Previously the Active tab
    // filtered for a status that never exists and was permanently empty.
    let result = tab === "pending" ? pendingOrgs : allOrgs;
    if (tab === "active")
      result = allOrgs.filter((o) => o.status === "approved");
    if (tab === "suspended")
      result = allOrgs.filter((o) => o.status === "suspended");
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.organisationName?.toLowerCase().includes(q) ||
          o.OrgEmail?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allOrgs, pendingOrgs, tab, search]);

  function handleApprove(org: Organisation) {
    approveOrg.mutate(
      {
        organisationId: org.organisationId,
        status: 'approved',
        rejectedReason: undefined,
      },{
        onSuccess: () => toast.success(`${org.organisationName} approved`),
        onError: () => toast.error('Failed to approve organisation'),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteOrg.mutate(deleteTarget.organisationId, {
      onSuccess: () => {
        toast.success("Organisation deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete organisation"),
    });
  }

  const counts = useMemo(
    () => ({
      all: allOrgs.length,
      pending: pendingOrgs.length,
      active: allOrgs.filter((o) => o.status === "approved").length,
      suspended: allOrgs.filter((o) => o.status === "suspended").length,
    }),
    [allOrgs, pendingOrgs],
  );

  const isLoading = loadingOrgs || loadingPending;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={Building2}
        eyebrow="Administration"
        title="Organisations"
        subtitle="Review pending applications, monitor active accounts, and manage the platform's tenants."
        gradient="from-violet-600 via-indigo-600 to-blue-700"
        stats={[
          { label: "Total",     value: counts.all,       icon: Building2 },
          { label: "Active",    value: counts.active,    icon: CheckCircle2 },
          { label: "Pending",   value: counts.pending,   icon: Clock },
          { label: "Suspended", value: counts.suspended, icon: Ban },
        ]}
      />

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pending
              {counts.pending > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]"
                >
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search organisations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* All tabs render the same filtered list component */}
        {["all", "pending", "active", "suspended"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <DataTableCard>
                {isLoading ? (
                  <div className="p-10 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">
                      Loading organisations...
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Building2 className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {search
                        ? "No organisations match your search"
                        : "No organisations found"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? "Try a different keyword." : "Pending applications will show up here once submitted."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[70px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((org, idx) => {
                        const sc =
                          statusConfig[org.status] ?? statusConfig.pending;
                        const StatusIcon = sc.icon;
                        return (
                          <TableRow
                            key={org.organisationId}
                            className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                          >
                            <TableCell className="text-xs text-gray-400">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {org.organisationName}
                                  </p>
                                  {org.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                                      {org.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                              {org.OrgEmail}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1 ${sc.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {org.createdAt
                                ? new Date(org.createdAt).toLocaleDateString()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDetailTarget(org)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {org.status === "pending" && (
                                    <DropdownMenuItem
                                      onClick={() => handleApprove(org)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                      Approve
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-600"
                                    onClick={() => setDeleteTarget(org)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </DataTableCard>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-500" />
              {detailTarget?.organisationName}
            </DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">
                    Email
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {detailTarget.OrgEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={statusConfig[detailTarget.status]?.color}
                  >
                    {statusConfig[detailTarget.status]?.label}
                  </Badge>
                </div>
                {detailTarget.phoneNumber && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                      Phone
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {detailTarget.phoneNumber}
                    </p>
                  </div>
                )}
                {detailTarget.address && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                      Address
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {detailTarget.address}
                    </p>
                  </div>
                )}
                {detailTarget.websiteUrl && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                      Website
                    </p>
                    <a
                      href={detailTarget.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {detailTarget.websiteUrl}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {detailTarget.description && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                      Description
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {detailTarget.description}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">
                    Created
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {detailTarget.createdAt
                      ? new Date(detailTarget.createdAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
              {detailTarget.status === "pending" && (
                <div className="pt-2 border-t dark:border-gray-800">
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleApprove(detailTarget);
                      setDetailTarget(null);
                    }}
                    disabled={approveOrg.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {approveOrg.isPending
                      ? "Approving..."
                      : "Approve Organisation"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organisation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.organisationName}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteOrg.isPending}
            >
              {deleteOrg.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
