'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from '@/hooks/api/useDocuments';
import type { Document as DocType, DocumentAccessLevel } from '@/types/api.types';

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
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// Default access level matches backend enum default: DocumentAccessLevel.VIEWER = 'VIEWER'
const EMPTY_UPLOAD: UploadForm = {
  title: '',
  description: '',
  file: null,
  accessLevel: 'VIEWER',
  tags: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getFileIcon(fileType: string) {
  const t = fileType?.toLowerCase() ?? '';
  if (t.includes('pdf'))
    return { Icon: FileText, color: 'text-red-500 bg-red-50', label: 'PDF' };
  if (t.includes('word') || t.includes('document'))
    return { Icon: FileText, color: 'text-blue-500 bg-blue-50', label: 'DOC' };
  if (t.includes('sheet') || t.includes('excel'))
    return { Icon: FileSpreadsheet, color: 'text-emerald-500 bg-emerald-50', label: 'XLS' };
  if (t.includes('presentation') || t.includes('powerpoint'))
    return { Icon: Presentation, color: 'text-orange-500 bg-orange-50', label: 'PPT' };
  return { Icon: File, color: 'text-slate-500 bg-slate-50', label: 'FILE' };
}

// Access config keyed by backend enum values: VIEWER | EDITOR | ADMIN | OWNER
const ACCESS_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; badgeClass: string; iconClass: string }
> = {
  VIEWER: {
    label: 'Viewer',
    Icon: Globe,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-600',
  },
  EDITOR: {
    label: 'Editor',
    Icon: Users,
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconClass: 'text-blue-600',
  },
  ADMIN: {
    label: 'Admin Only',
    Icon: ShieldAlert,
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconClass: 'text-amber-600',
  },
  OWNER: {
    label: 'Owner Only',
    Icon: Lock,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    iconClass: 'text-slate-500',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccessBadge({ level }: { level: string }) {
  const cfg = ACCESS_CONFIG[level] ?? ACCESS_CONFIG.VIEWER;
  const { Icon, label, badgeClass } = cfg;
  return (
    <Badge variant="outline" className={`text-xs font-medium border gap-1 ${badgeClass}`}>
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
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Access Level Select (shared by Upload + Edit dialogs) ────────────────────

function AccessLevelSelect({
  value,
  onChange,
}: {
  value: DocumentAccessLevel;
  onChange: (v: DocumentAccessLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DocumentAccessLevel)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* Values MUST match backend DocumentAccessLevel enum exactly */}
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
  const createMutation = useCreateDocument();

  const handleFileSelect = (file: File) => {
    setForm((f) => ({
      ...f,
      file,
      title: f.title || file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!form.file) { toast.error('Please select a file to upload'); return; }
    if (!form.title.trim()) { toast.error('Please enter a document title'); return; }

    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        file: form.file,
        accessLevel: form.accessLevel,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      toast.success('Document uploaded successfully', {
        description: `"${form.title}" has been added to the library.`,
      });
      setForm(EMPTY_UPLOAD);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Upload failed', {
        description: err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending) { setForm(EMPTY_UPLOAD); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Upload Document</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">Add a new document to the library</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-150 select-none
              ${dragOver ? 'border-primary bg-primary/5 scale-[0.99]'
                : form.file ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
          >
            {form.file ? (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">{form.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(form.file.size)}</p>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="text-xs h-7 mt-1 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, file: null })); }}
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
                <p className="text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX · max 10 MB</p>
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
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="doc-desc"
              placeholder="Brief description of this document…"
              rows={2}
              className="resize-none text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
              Tags <span className="text-muted-foreground text-xs font-normal">(comma separated)</span>
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="doc-tags"
                placeholder="budget, finance, 2024"
                className="pl-8"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !form.file || !form.title.trim()}
            className="gap-2 min-w-28"
          >
            {createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
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
    title: doc?.title ?? '',
    description: doc?.description ?? '',
    accessLevel: (doc?.accessLevel as DocumentAccessLevel) ?? 'VIEWER',
    tags: (doc?.tags ?? []).join(', '),
  });

  // Sync form when doc prop changes (e.g. opening dialog for a different doc)
  const [prevDocId, setPrevDocId] = useState<string | undefined>(doc?.id);
  if (doc?.id !== prevDocId) {
    setPrevDocId(doc?.id);
    setForm({
      title: doc?.title ?? '',
      description: doc?.description ?? '',
      accessLevel: (doc?.accessLevel as DocumentAccessLevel) ?? 'VIEWER',
      tags: (doc?.tags ?? []).join(', '),
    });
  }

  const handleSubmit = async () => {
    if (!doc) return;
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    try {
      await updateMutation.mutateAsync({
        id: doc.id,
        data: {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          accessLevel: form.accessLevel,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        },
      });
      toast.success('Document updated', {
        description: `"${form.title}" has been updated successfully.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Update failed', {
        description: err?.message ?? 'Could not update document. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Edit Document</DialogTitle>
              <DialogDescription className="text-sm mt-0.5 truncate max-w-xs">{doc?.title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Title <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Document title"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description…"
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
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !form.title.trim()}
            className="gap-2 min-w-28"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Pencil className="h-4 w-4" />Save Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onEdit,
  onDelete,
}: {
  doc: DocType;
  onEdit: (doc: DocType) => void;
  onDelete: (doc: DocType) => void;
}) {
  const { Icon, color, label } = getFileIcon(doc.fileType ?? '');

  const handleView = () => {
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    else toast.error('Preview unavailable', { description: 'No file URL found for this document.' });
  };

  const handleDownload = () => {
    if (!doc.fileUrl) {
      toast.error('Download unavailable', { description: 'No file URL found for this document.' });
      return;
    }
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName ?? doc.title;
    link.click();
    toast.success('Download started', { description: doc.title });
  };

  return (
    <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}>
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-bold mt-0.5 tracking-wide opacity-70">{label}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground truncate max-w-[240px] sm:max-w-sm">
                {doc.title}
              </h3>
              {doc.accessLevel && <AccessBadge level={doc.accessLevel} />}
              {doc.version != null && doc.version > 1 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground border-dashed">
                  v{doc.version}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />{formatFileSize(doc.fileSize)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{formatDate(doc.uploadedAt)}
              </span>
              {doc.uploadedByName && <span className="truncate">by {doc.uploadedByName}</span>}
            </div>

            {doc.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">{doc.description}</p>
            )}

            {(doc.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {doc.tags!.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-4.5">{tag}</Badge>
                ))}
                {doc.tags!.length > 4 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4.5 text-muted-foreground">
                    +{doc.tags!.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={handleView} title="Preview">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={handleDownload} title="Download">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onEdit(doc)}><Pencil className="mr-2 h-4 w-4" />Edit details</DropdownMenuItem>
                <DropdownMenuItem onClick={handleView}><Eye className="mr-2 h-4 w-4" />Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                <DropdownMenuItem><Star className="mr-2 h-4 w-4" />Favourite</DropdownMenuItem>
                <DropdownMenuItem><Share2 className="mr-2 h-4 w-4" />Share</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<DocType | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocType | null>(null);

  const { data: documentsData, isLoading, error, refetch } = useDocuments({
    query: searchQuery || undefined,
    accessLevel: accessFilter === 'all' ? undefined : (accessFilter as DocumentAccessLevel),
  });

  const deleteMutation = useDeleteDocument();
  const documents: DocType[] = documentsData?.items ?? [];

  const filteredDocs = documents.filter((doc) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      !term ||
      doc.title?.toLowerCase().includes(term) ||
      (doc.tags ?? []).some((t) => t.toLowerCase().includes(term)) ||
      doc.description?.toLowerCase().includes(term);
    const matchesAccess = accessFilter === 'all' || doc.accessLevel === accessFilter;
    return matchesSearch && matchesAccess;
  });

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDoc) return;
    try {
      await deleteMutation.mutateAsync(deleteDoc.id);
      toast.success('Document deleted', { description: `"${deleteDoc.title}" has been permanently removed.` });
      setDeleteDoc(null);
    } catch (err: any) {
      toast.error('Delete failed', { description: err?.message ?? 'Could not delete document. Please try again.' });
    }
  }, [deleteDoc, deleteMutation]);

  const totalSize = documents.reduce((sum, d) => sum + (d.fileSize ?? 0), 0);

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage files, folders, and board records</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load documents</AlertTitle>
          <AlertDescription className="mt-1">{(error as Error).message ?? 'An unexpected error occurred.'}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8 px-4 md:px-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage files, folders, and board records</p>
        </div>
        <Button size="sm" className="gap-2 h-9 shrink-0" onClick={() => setUploadOpen(true)}>
          <FilePlus className="h-4 w-4" />Upload Document
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Documents" value={documents.length} icon={FileText} colorClass="text-blue-600 bg-blue-50" />
          <StatCard label="Storage Used" value={formatFileSize(totalSize)} icon={HardDrive} colorClass="text-violet-600 bg-violet-50" />
          <StatCard label="Showing" value={filteredDocs.length} icon={FolderOpen} colorClass="text-emerald-600 bg-emerald-50" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, tag, or description…"
            className="h-9 pl-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter by access level — values match backend enum */}
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="h-9 w-44 text-sm shrink-0">
            <SelectValue placeholder="Access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="VIEWER">
              <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-emerald-600" />Viewer</div>
            </SelectItem>
            <SelectItem value="EDITOR">
              <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-blue-600" />Editor</div>
            </SelectItem>
            <SelectItem value="ADMIN">
              <div className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-amber-600" />Admin Only</div>
            </SelectItem>
            <SelectItem value="OWNER">
              <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-slate-500" />Owner Only</div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      )}

      {/* Document List */}
      {!isLoading && (
        <div className="space-y-2.5">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onEdit={setEditDoc} onDelete={setDeleteDoc} />
            ))
          ) : (
            <Card className="border-dashed py-20 text-center">
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || accessFilter !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : 'Upload your first document to get started.'}
                </p>
                {!searchQuery && accessFilter === 'all' && (
                  <Button size="sm" className="gap-2 mt-1" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4" />Upload Document
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={() => refetch()} />

      <EditDialog
        doc={editDoc}
        open={!!editDoc}
        onOpenChange={(v) => { if (!v) setEditDoc(null); }}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={!!deleteDoc} onOpenChange={(v) => { if (!v) setDeleteDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-1">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-foreground">"{deleteDoc?.title}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</>
              ) : (
                <><Trash2 className="h-4 w-4" />Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Documents;