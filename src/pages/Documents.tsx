"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "@/hooks/api/useDocuments";
import type {
  Document as DocType,
  DocumentAccessLevel,
} from "@/types/api.types";
import { DocumentViewer } from "./DocumentViewer";

import {
  Search,
  Upload,
  FileText,
  Download,
  Eye,
  MoreVertical,
  Star,
  Share2,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FilePlus,
  FileSpreadsheet,
  Presentation,
  File,
  Lock,
  Globe,
  Users,
  ShieldAlert,
  X,
  Pencil,
  Tag,
  CheckCircle2,
  FolderOpen,
  Clock,
  HardDrive,
  LayoutGrid,
  LayoutList,
  FileSearch,
  SlidersHorizontal,
} from "lucide-react";
import { documentsService } from "@/api/services";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "grid";

interface UploadForm {
  title: string;
  description: string;
  file: File | null;
  accessLevel: DocumentAccessLevel;
  tags: string;
}

interface EditForm {
  title: string;
  description: string;
  accessLevel: DocumentAccessLevel;
  tags: string;
}

const EMPTY_UPLOAD: UploadForm = {
  title: "",
  description: "",
  file: null,
  accessLevel: "VIEWER",
  tags: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// IMPROVEMENT: added 'image' type support
function getFileIcon(fileType: string) {
  const t = fileType?.toLowerCase() ?? "";
  if (t.includes("pdf"))
    return {
      Icon: FileText,
      color: "text-red-500 bg-red-50 dark:bg-red-950/30",
      label: "PDF",
    };
  if (t.includes("word") || t.includes("document"))
    return {
      Icon: FileText,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
      label: "DOC",
    };
  if (t.includes("sheet") || t.includes("excel"))
    return {
      Icon: FileSpreadsheet,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
      label: "XLS",
    };
  if (t.includes("presentation") || t.includes("powerpoint"))
    return {
      Icon: Presentation,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
      label: "PPT",
    };
  if (
    t.includes("image") ||
    t.includes("png") ||
    t.includes("jpg") ||
    t.includes("jpeg")
  )
    return {
      Icon: File,
      color: "text-pink-500 bg-pink-50 dark:bg-pink-950/30",
      label: "IMG",
    };
  return {
    Icon: File,
    color: "text-slate-500 bg-slate-100 dark:bg-slate-800",
    label: "FILE",
  };
}

const ACCESS_CONFIG: Record<
  string,
  {
    label: string;
    Icon: React.ElementType;
    badgeClass: string;
    iconClass: string;
  }
> = {
  VIEWER: {
    label: "Viewer",
    Icon: Globe,
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    iconClass: "text-emerald-600",
  },
  EDITOR: {
    label: "Editor",
    Icon: Users,
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    iconClass: "text-blue-600",
  },
  ADMIN: {
    label: "Admin Only",
    Icon: ShieldAlert,
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    iconClass: "text-amber-600",
  },
  OWNER: {
    label: "Owner Only",
    Icon: Lock,
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    iconClass: "text-slate-500",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccessBadge({ level }: { level: string }) {
  const cfg = ACCESS_CONFIG[level] ?? ACCESS_CONFIG.VIEWER;
  const { Icon, label, badgeClass } = cfg;
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium border gap-1 ${badgeClass}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] hover:border-border transition-all duration-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/40 dark:ring-white/5 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-black tabular-nums tracking-tight text-foreground leading-tight truncate mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Access Level Select ──────────────────────────────────────────────────────

function AccessLevelSelect({
  value,
  onChange,
}: {
  value: DocumentAccessLevel;
  onChange: (v: DocumentAccessLevel) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as DocumentAccessLevel)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="VIEWER">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            <span>Viewer — everyone can read</span>
          </div>
        </SelectItem>
        <SelectItem value="EDITOR">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span>Editor — members can edit</span>
          </div>
        </SelectItem>
        <SelectItem value="ADMIN">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Admin — admins only</span>
          </div>
        </SelectItem>
        <SelectItem value="OWNER">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-500" />
            <span>Owner — restricted</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UploadForm>(EMPTY_UPLOAD);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);     // 0–100 — live upload bytes
  const [serverProcessing, setServerProcessing] = useState(false); // bytes done, server still working
  const createMutation = useCreateDocument();

  const handleFileSelect = (file: File) => {
    setForm((f) => ({
      ...f,
      file,
      title: f.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!form.file)          { toast.error('Please select a file to upload'); return; }
    if (!form.title.trim())  { toast.error('Please enter a document title');  return; }

    // Live toast: starts as a loading toast, morphs to success/error in place.
    // Gives the user immediate feedback even on slow uploads.
    const toastId = toast.loading(`Uploading "${form.title.trim()}"…`, {
      description: '0% — preparing file',
    });
    setUploadPct(0);
    setServerProcessing(false);

    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        file: form.file,
        accessLevel: form.accessLevel,
        tags:        form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        onProgress: (pct) => {
          setUploadPct(pct);
          if (pct >= 100) {
            // Bytes are at the server — now Azure + DB do their thing.
            // Switch the bar to indeterminate-ish "processing" mode and update
            // the toast description so the user knows we're not stuck.
            setServerProcessing(true);
            toast.loading(`Uploading "${form.title.trim()}"…`, {
              id: toastId,
              description: 'Saving to storage…',
            });
          } else {
            toast.loading(`Uploading "${form.title.trim()}"…`, {
              id: toastId,
              description: `${pct}% — sending file`,
            });
          }
        },
      });

      toast.success('Document uploaded', {
        id: toastId,
        description: `"${form.title}" is now in the library.`,
      });
      setForm(EMPTY_UPLOAD);
      setUploadPct(0);
      setServerProcessing(false);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const isTimeout = err?.code === 'ECONNABORTED';
      const isNetwork = !isTimeout && !err?.response;
      toast.error(
        isTimeout ? 'Upload timed out'
        : isNetwork ? 'Cannot reach the server'
        : 'Upload failed',
        {
          id: toastId,
          description: isTimeout
            ? 'The server took too long. Check your connection and try again.'
            : isNetwork
            ? 'The server is not responding. Make sure the backend is running.'
            : err?.message ?? 'Something went wrong. Please try again.',
          duration: 6000,
        },
      );
      setServerProcessing(false);
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      setForm(EMPTY_UPLOAD);
      setUploadPct(0);
      setServerProcessing(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                Upload Document
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Add a new document to the library
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-7 text-center cursor-pointer transition-all duration-150 select-none
              ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : form.file
                    ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
          >
            {form.file ? (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground break-all">
                  {form.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(form.file.size)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 mt-1 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm((f) => ({ ...f, file: null }));
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground/70" />
                  </div>
                </div>
                <p className="text-sm font-medium">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX · max 10 MB
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-title"
              placeholder="e.g. Q1 Financial Report"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-desc" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="doc-desc"
              placeholder="Brief description of this document…"
              rows={2}
              className="resize-none text-sm"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Access Level</Label>
            <AccessLevelSelect
              value={form.accessLevel}
              onChange={(v) => setForm((f) => ({ ...f, accessLevel: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-tags" className="text-sm font-medium">
              Tags{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (comma separated)
              </span>
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="doc-tags"
                placeholder="budget, finance, 2024"
                className="pl-8"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        {/* Inline progress bar — visible during the actual upload + server save.
            Gives the user a real signal that progress is happening rather than
            a single indefinite spinner. */}
        {createMutation.isPending && (
          <div className="space-y-1.5 -mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {serverProcessing ? 'Saving to storage…' : 'Uploading file…'}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {serverProcessing ? '100%' : `${uploadPct}%`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-[width] duration-200 ${
                  serverProcessing ? 'animate-pulse' : ''
                }`}
                style={{ width: `${serverProcessing ? 100 : uploadPct}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 border-t border-border/60 pt-4 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}
            disabled={createMutation.isPending || !form.file || !form.title.trim()}
            className="gap-2 w-full sm:w-auto sm:min-w-32">
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {serverProcessing ? 'Saving…' : `Uploading ${uploadPct}%`}
              </>
            ) : (
              <><Upload className="h-4 w-4" />Upload</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  doc,
  open,
  onOpenChange,
  onSuccess,
}: {
  doc: DocType | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const updateMutation = useUpdateDocument();
  const [form, setForm] = useState<EditForm>({
    title: doc?.title ?? "",
    description: doc?.description ?? "",
    accessLevel: (doc?.accessLevel as DocumentAccessLevel) ?? "VIEWER",
    tags: (doc?.tags ?? []).join(", "),
  });

  // FIX: the previous "set state during render with a sentinel" pattern is the
  // same anti-pattern that crashed MinutesManager. A real useEffect is safer
  // and lets React schedule the update properly when the dialog reopens with
  // a different document.
  useEffect(() => {
    setForm({
      title: doc?.title ?? "",
      description: doc?.description ?? "",
      accessLevel: (doc?.accessLevel as DocumentAccessLevel) ?? "VIEWER",
      tags: (doc?.tags ?? []).join(", "),
    });
  }, [doc?.id, doc?.title, doc?.description, doc?.accessLevel, doc?.tags]);

  const handleSubmit = async () => {
    if (!doc) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: doc.id,
        data: {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          accessLevel: form.accessLevel,
          tags: form.tags
            ? form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        },
      });
      toast.success("Document updated", {
        description: `"${form.title}" has been updated successfully.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Update failed", {
        description:
          err?.message ?? "Could not update document. Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                Edit Document
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5 truncate max-w-[220px] sm:max-w-xs">
                {doc?.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.title}
              placeholder="Document title"
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              value={form.description}
              placeholder="Brief description…"
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Access Level</Label>
            <AccessLevelSelect
              value={form.accessLevel}
              onChange={(v) => setForm((f) => ({ ...f, accessLevel: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                className="pl-8"
                placeholder="budget, finance, 2024"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-4 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !form.title.trim()}
            className="gap-2 w-full sm:w-auto sm:min-w-28"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document Actions Menu (shared by row + card) ─────────────────────────────
// IMPROVEMENT: extracted into a single reusable component to avoid duplication

function DocActionsMenu({
  doc,
  onEdit,
  onDelete,
  onView,
  onDownload,
}: {
  doc: DocType;
  onEdit: (doc: DocType) => void;
  onDelete: (doc: DocType) => void;
  onView: (doc: DocType) => void;
  onDownload: (doc: DocType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(doc)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onView(doc)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload(doc)}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Star className="mr-2 h-4 w-4" />
          Favourite
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Document Row (List View) ─────────────────────────────────────────────────

function DocumentRow({
  doc,
  onEdit,
  onDelete,
  onView,
}: {
  doc: DocType;
  onEdit: (doc: DocType) => void;
  onDelete: (doc: DocType) => void;
  onView: (doc: DocType) => void;
}) {
  const { Icon, color, label } = getFileIcon(doc.fileType ?? "");

  // IMPROVEMENT: download handler centralised and reused
  const handleDownload = useCallback(async () => {
    try {
      const url =
        doc.downloadUrl ?? (await documentsService.getDownloadurl(doc.id));
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.fileName ?? doc.title;
      link.click();
      toast.success("Download started", { description: doc.title });
    } catch (err: any) {
      toast.error("Download failed", {
        description: err?.message ?? "No download URL available.",
      });
    }
  }, [doc]);

  return (
    <Card className="border border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] hover:border-border transition-all duration-200 group">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          {/* File type icon */}
          <div
            className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 ${color}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-[8px] sm:text-[9px] font-bold mt-0.5 tracking-wide opacity-70">
              {label}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              {/* IMPROVEMENT: title is now clickable for quick preview */}
              <h3
                className="font-semibold text-sm text-foreground truncate max-w-[180px] xs:max-w-[220px] sm:max-w-sm md:max-w-md cursor-pointer hover:text-primary transition-colors"
                onClick={() => onView(doc)}
              >
                {doc.title}
              </h3>
              {doc.accessLevel && <AccessBadge level={doc.accessLevel} />}
              {doc.version != null && doc.version > 1 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground border-dashed"
                >
                  v{doc.version}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3 shrink-0" />
                {formatFileSize(doc.fileSize)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {formatDate(doc.uploadedAt)}
              </span>
              {doc.uploadedByName && (
                <span className="hidden sm:inline truncate">
                  by {doc.uploadedByName}
                </span>
              )}
            </div>

            {doc.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[240px] sm:max-w-sm hidden sm:block">
                {doc.description}
              </p>
            )}

            {/* IMPROVEMENT: tag pills now show correctly */}
            {(doc.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {doc.tags!.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-4.5"
                  >
                    {tag}
                  </Badge>
                ))}
                {doc.tags!.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground"
                  >
                    +{doc.tags!.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex hover:bg-primary/10 hover:text-primary opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={() => onView(doc)}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex hover:bg-primary/10 hover:text-primary opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <DocActionsMenu
              doc={doc}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Document Card (Grid View) ────────────────────────────────────────────────

function DocumentCard({
  doc,
  onEdit,
  onDelete,
  onView,
}: {
  doc: DocType;
  onEdit: (doc: DocType) => void;
  onDelete: (doc: DocType) => void;
  onView: (doc: DocType) => void;
}) {
  const { Icon, color, label } = getFileIcon(doc.fileType ?? "");

  const handleDownload = useCallback( async () => {
    try{
      const url = doc.downloadUrl ?? await documentsService.getDownloadurl(doc.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName ?? doc.title;
      link.click();
      toast.success('Download started...', {description: doc.title});
      } catch(err: unknown){
      const message = err instanceof Error ? err.message : 'No download url available.';
      toast.error('Download started', {description: message})
    }
  }, [doc]);

  return (
    <Card className="border border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] hover:border-border transition-all duration-200 group flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-bold mt-0.5 tracking-wide opacity-70">
              {label}
            </span>
          </div>
          <DocActionsMenu
            doc={doc}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            onDownload={handleDownload}
          />
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* IMPROVEMENT: title clickable for preview */}
          <h3
            className="font-semibold text-sm text-foreground line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors"
            onClick={() => onView(doc)}
          >
            {doc.title}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {doc.accessLevel && <AccessBadge level={doc.accessLevel} />}
            {doc.version != null && doc.version > 1 && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground border-dashed"
              >
                v{doc.version}
              </Badge>
            )}
          </div>
          {doc.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {doc.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {(doc.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {doc.tags!.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-1.5 py-0 h-4.5"
              >
                {tag}
              </Badge>
            ))}
            {doc.tags!.length > 3 && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground"
              >
                +{doc.tags!.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer meta */}
        <div className="border-t border-border/50 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(doc.fileSize)}
            </span>
            <span className="flex items-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDate(doc.uploadedAt)}
            </span>
          </div>
          {doc.uploadedByName && (
            <p className="text-xs text-muted-foreground truncate">
              by {doc.uploadedByName}
            </p>
          )}
          <div className="flex gap-1.5 pt-0.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              onClick={() => onView(doc)}
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── View Toggle ──────────────────────────────────────────────────────────────

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 shrink-0">
      {(["list", "grid"] as const).map((mode) => (
        <Button
          key={mode}
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md transition-all ${
            viewMode === mode
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange(mode)}
          title={`${mode} view`}
        >
          {mode === "list" ? (
            <LayoutList className="h-3.5 w-3.5" />
          ) : (
            <LayoutGrid className="h-3.5 w-3.5" />
          )}
        </Button>
      ))}
    </div>
  );
}

// ─── Delete Confirm Dialog (extracted) ───────────────────────────────────────
// IMPROVEMENT: extracted into its own component to avoid duplicate JSX blocks
// (was copy-pasted twice in the original — once in viewer mode, once in normal mode)

function DeleteConfirmDialog({
  doc,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  doc: DocType | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 shrink-0">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            Delete Document
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-1">
            Are you sure you want to permanently delete{" "}
            <span className="font-medium text-foreground">"{doc?.title}"</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <AlertDialogCancel disabled={isPending} className="mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
// IMPROVEMENT: extracted into its own component for clarity

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2.5">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-[72px] sm:h-[76px] animate-pulse rounded-xl bg-muted/50"
            />
          ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-muted/50" />
        ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
// IMPROVEMENT: better empty state with context-aware messaging

function EmptyState({
  isFiltered,
  onUpload,
}: {
  isFiltered: boolean;
  onUpload: () => void;
}) {
  return (
    <Card className="border-dashed py-14 sm:py-20 text-center">
      <CardContent className="space-y-4 px-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-muted">
            {isFiltered ? (
              <FileSearch className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/50" />
            ) : (
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/50" />
            )}
          </div>
        </div>
        <h3 className="text-base sm:text-lg font-medium">
          {isFiltered ? "No matching documents" : "No documents yet"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isFiltered
            ? "Try adjusting your search or filter to find what you're looking for."
            : "Upload your first document to start building the library."}
        </p>
        {!isFiltered && (
          <Button size="sm" className="gap-2 mt-1" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<DocType | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocType | null>(null);
  const [viewDoc, setViewDoc] = useState<DocType | null>(null);

  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useDocuments({
    query: searchQuery || undefined,
    accessLevel:
      accessFilter === "all"
        ? undefined
        : (accessFilter as DocumentAccessLevel),
  });

  const deleteMutation = useDeleteDocument();

  // ── FIX: defensive ResponseObject unwrap ─────────────────────────────────
  // The backend returns one of:
  //   { statusCode, message, data: Document[], pageInfo }     (normal)
  //   { data: { statusCode, message, data: Document[] } }     (some controllers double-wrap)
  //   Document[]                                              (array straight back)
  // Previously the page only checked .data and .items, so a double-wrapped
  // payload silently rendered as empty. Walk one extra level when the
  // outer .data is itself a ResponseObject-shaped object.
  const documents: DocType[] = useMemo(() => {
    const raw = documentsData as unknown;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as DocType[];
    const r = raw as { data?: unknown; items?: unknown };
    if (Array.isArray(r.data))  return r.data  as DocType[];
    if (Array.isArray(r.items)) return r.items as DocType[];
    // Double-wrap: { data: { data: Document[] } }
    const inner = r.data as { data?: unknown } | undefined;
    if (inner && Array.isArray(inner.data)) return inner.data as DocType[];
    return [];
  }, [documentsData]);

  // ── IMPROVEMENT: client-side filtering with useMemo ───────────────────────
  // Avoids re-filtering on every render
  const filteredDocs = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    return documents.filter((doc) => {
      const matchesSearch =
        !term ||
        doc.title?.toLowerCase().includes(term) ||
        (doc.tags ?? []).some((t) => t.toLowerCase().includes(term)) ||
        doc.description?.toLowerCase().includes(term);
      const matchesAccess =
        accessFilter === "all" || doc.accessLevel === accessFilter;
      return matchesSearch && matchesAccess;
    });
  }, [documents, searchQuery, accessFilter]);

  // ── IMPROVEMENT: memoised stats ───────────────────────────────────────────
  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0),
    [documents],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDoc) return;
    try {
      await deleteMutation.mutateAsync(deleteDoc.id);
      toast.success("Document deleted", {
        description: `"${deleteDoc.title}" has been permanently removed.`,
      });
      setDeleteDoc(null);
    } catch (err: any) {
      toast.error("Delete failed", {
        description:
          err?.message ?? "Could not delete document. Please try again.",
      });
    }
  }, [deleteDoc, deleteMutation]);

  // ── IMPROVEMENT: clear all filters handler ────────────────────────────────
  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setAccessFilter("all");
  }, []);

  const isFiltered = !!searchQuery || accessFilter !== "all";

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage files, folders, and board records
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load documents</AlertTitle>
          <AlertDescription className="mt-1">
            {(error as Error).message ?? "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // ── Inline viewer mode ────────────────────────────────────────────────────
  // IMPROVEMENT: dialogs are kept mounted even in viewer mode so
  // edit/delete still work without re-mounting state
  if (viewDoc) {
    return (
      <div className="pb-12">
        <DocumentViewer
          doc={viewDoc}
          allDocs={filteredDocs}
          onClose={() => setViewDoc(null)}
        />
        <EditDialog
          doc={editDoc}
          open={!!editDoc}
          onOpenChange={(v) => {
            if (!v) setEditDoc(null);
          }}
          onSuccess={() => refetch()}
        />
        <DeleteConfirmDialog
          doc={deleteDoc}
          open={!!deleteDoc}
          onOpenChange={(v) => {
            if (!v) setDeleteDoc(null);
          }}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  // Full-bleed: AppLayout's p-6 handles outer padding, no container/max-w cap
  // so the page expands to fill the area between the sidebar and right edge,
  // matching the Members / Organisation / Tasks pages.
  return (
    <div className="space-y-6 pb-12 antialiased">

      {/* Header — gradient logo tile + bold title (consistent with the rest of the app) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <FolderOpen className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Manage files, folders and board records — searchable by title, tag and access level.
            </p>
          </div>
        </div>
        <Button size="sm"
          className="h-9 gap-2 shrink-0 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-inset ring-white/10"
          onClick={() => setUploadOpen(true)}>
          <FilePlus className="h-4 w-4" />Upload Document
        </Button>
      </div>

      {/* Stats — only shown when there are documents */}
      {!isLoading && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="Total Documents"
            value={documents.length}
            icon={FileText}
            colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            label="Storage Used"
            value={formatFileSize(totalSize)}
            icon={HardDrive}
            colorClass="text-violet-600 bg-violet-50 dark:bg-violet-950/30"
          />
          <StatCard
            label="Showing"
            value={filteredDocs.length}
            icon={FolderOpen}
            colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
          />
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, tag, or description…"
            className="h-9 pl-9 pr-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={accessFilter} onValueChange={setAccessFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40 text-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              <SelectItem value="VIEWER">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  Viewer
                </div>
              </SelectItem>
              <SelectItem value="EDITOR">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Editor
                </div>
              </SelectItem>
              <SelectItem value="ADMIN">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Admin Only
                </div>
              </SelectItem>
              <SelectItem value="OWNER">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  Owner Only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* IMPROVEMENT: active filter chips so users can see + clear active filters */}
      {isFiltered && !isLoading && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {searchQuery && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 h-5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => setSearchQuery("")}
            >
              "{searchQuery}" <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {accessFilter !== "all" && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 h-5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => setAccessFilter("all")}
            >
              {ACCESS_CONFIG[accessFilter]?.label ?? accessFilter}{" "}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          <button
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <LoadingSkeleton viewMode={viewMode} />}

      {/* Document list / grid */}
      {!isLoading &&
        (filteredDocs.length > 0 ? (
          viewMode === "list" ? (
            <div className="space-y-2 sm:space-y-2.5">
              {filteredDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onEdit={setEditDoc}
                  onDelete={setDeleteDoc}
                  onView={setViewDoc}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onEdit={setEditDoc}
                  onDelete={setDeleteDoc}
                  onView={setViewDoc}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            isFiltered={isFiltered}
            onUpload={() => setUploadOpen(true)}
          />
        ))}

      {/* IMPROVEMENT: result count shown as a subtle footer when filtering */}
      {!isLoading && filteredDocs.length > 0 && isFiltered && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Showing {filteredDocs.length} of {documents.length} document
          {documents.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => refetch()}
      />

      <EditDialog
        doc={editDoc}
        open={!!editDoc}
        onOpenChange={(v) => {
          if (!v) setEditDoc(null);
        }}
        onSuccess={() => refetch()}
      />

      <DeleteConfirmDialog
        doc={deleteDoc}
        open={!!deleteDoc}
        onOpenChange={(v) => {
          if (!v) setDeleteDoc(null);
        }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

export default Documents;
