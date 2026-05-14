'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText, FileSpreadsheet, Presentation, File as FileIcon,
  Image as ImageIcon, Filter, Eye, Download, Lock, Search, X,
  ShieldAlert, Globe, Users, Loader2, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDocuments } from '@/hooks/api';
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { Document as ApiDocument, DocumentAccessLevel } from '@/types/api.types';
import { EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { DocumentViewer } from '@/pages/DocumentViewer';

// Match what DocumentViewer reads. The page was previously using a stale
// local `Document` type with `documentId`/`category`/`isConfidential` —
// none of which the API actually returns. We adapt minimally and pass
// through to the (already well-built) DocumentViewer.

function formatSize(bytes?: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fileMeta(fileType: string | undefined) {
  const t = (fileType ?? '').toLowerCase();
  if (t.includes('pdf'))                                       return { Icon: FileText,        clr: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/40',         lbl: 'PDF' };
  if (t.includes('word') || t.includes('document'))            return { Icon: FileText,        clr: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/40',       lbl: 'DOC' };
  if (t.includes('sheet') || t.includes('excel'))              return { Icon: FileSpreadsheet, clr: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', lbl: 'XLS' };
  if (t.includes('presentation') || t.includes('powerpoint'))  return { Icon: Presentation,    clr: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/40',   lbl: 'PPT' };
  if (t.includes('image'))                                     return { Icon: ImageIcon,       clr: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/40',   lbl: 'IMG' };
  return                                                              { Icon: FileIcon,        clr: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',       lbl: 'FILE' };
}

const ACCESS_META: Record<DocumentAccessLevel, { label: string; Icon: React.ElementType; chip: string }> = {
  VIEWER: { label: 'Viewer',     Icon: Globe,       chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900' },
  EDITOR: { label: 'Editor',     Icon: Users,       chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900' },
  ADMIN:  { label: 'Admin only', Icon: ShieldAlert, chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900' },
  OWNER:  { label: 'Owner only', Icon: Lock,        chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

export function DocumentsPage() {
  const { data: documentsData, isLoading } = useDocuments();
  const documents = useMemo(() => unwrapList<ApiDocument>(documentsData), [documentsData]);

  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | DocumentAccessLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'office' | 'image' | 'other'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      documents
        .filter((d) => {
          const q = search.trim().toLowerCase();
          const matchSearch =
            !q ||
            d.title.toLowerCase().includes(q) ||
            (d.fileName ?? '').toLowerCase().includes(q) ||
            (d.description ?? '').toLowerCase().includes(q) ||
            (d.tags ?? []).some((t) => t.toLowerCase().includes(q));

          const matchAccess = accessFilter === 'all' || d.accessLevel === accessFilter;

          const t = (d.fileType ?? '').toLowerCase();
          const matchType =
            typeFilter === 'all' ? true
            : typeFilter === 'pdf' ? t.includes('pdf')
            : typeFilter === 'office' ? /(word|document|sheet|excel|presentation|powerpoint)/.test(t)
            : typeFilter === 'image' ? t.includes('image')
            : !/(pdf|word|document|sheet|excel|presentation|powerpoint|image)/.test(t);

          return matchSearch && matchAccess && matchType;
        })
        .sort((a, b) => {
          const aT = new Date(a.uploadedAt ?? a.createdAt ?? 0).getTime();
          const bT = new Date(b.uploadedAt ?? b.createdAt ?? 0).getTime();
          return bT - aT;
        }),
    [documents, search, accessFilter, typeFilter],
  );

  const selected = selectedId ? documents.find((d) => d.id === selectedId) ?? null : null;

  // Download via the signed URL the same way DocumentViewer does — the API
  // doesn't ship a public downloadUrl on the list payload, only after a
  // round-trip to /documents/:id/download-url.
  const handleDownload = async (doc: ApiDocument) => {
    if (downloadingId) return;
    setDownloadingId(doc.id);
    try {
      const r = await apiClient.get(ENDPOINTS.DOCUMENTS.DOWNLOAD_URL(doc.id), { timeout: 15_000 });
      const body = r.data as Record<string, unknown> | undefined;
      const url =
        (body?.data as { url?: string } | undefined)?.url
        ?? ((body as { url?: string } | undefined)?.url)
        ?? doc.downloadUrl
        ?? null;
      if (!url) {
        toast.error('Download link unavailable');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName ?? doc.title;
      a.click();
      toast.success('Download started', { description: doc.title });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as Error)?.message ?? 'Download failed';
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // Viewer takeover — render the full DocumentViewer inline when a doc is
  // open. Returning here keeps the rest of the layout from rendering, so
  // the user gets a focused reading experience without losing the
  // navigation shell on the left.
  if (selected) {
    return (
      <MemberPortalLayout
        icon={FileText}
        title={selected.title}
        color="bg-sky-600"
        subtitle={selected.fileName ?? 'Document preview'}
      >
        <div className="flex items-center justify-between mb-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back to documents
          </Button>
        </div>
        <DocumentViewer
          doc={selected}
          allDocs={filtered}
          onClose={() => setSelectedId(null)}
        />
      </MemberPortalLayout>
    );
  }

  return (
    <MemberPortalLayout icon={FileText} title="Documents" color="bg-sky-600" subtitle="Board packs, policies, reports and more">
      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total documents', value: documents.length, tone: 'from-sky-500 to-blue-600' },
          { label: 'PDFs', value: documents.filter((d) => (d.fileType ?? '').toLowerCase().includes('pdf')).length, tone: 'from-red-500 to-rose-600' },
          { label: 'Office files', value: documents.filter((d) => /(word|document|sheet|excel|presentation|powerpoint)/.test((d.fileType ?? '').toLowerCase())).length, tone: 'from-emerald-500 to-teal-600' },
          { label: 'Restricted', value: documents.filter((d) => d.accessLevel === 'ADMIN' || d.accessLevel === 'OWNER').length, tone: 'from-amber-500 to-orange-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{s.label}</p>
            <div className={`mt-2 inline-flex items-center rounded-xl bg-gradient-to-r px-3 py-1.5 text-xl font-black text-white ${s.tone}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, filename, or tags…"
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all"
            aria-label="Search documents"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl text-sm shrink-0">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All file types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="office">Office (Word / Excel / PPT)</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accessFilter} onValueChange={(v) => setAccessFilter(v as typeof accessFilter)}>
          <SelectTrigger className="h-10 w-full sm:w-40 rounded-xl text-sm shrink-0">
            <Lock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any access</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="ADMIN">Admin only</SelectItem>
            <SelectItem value="OWNER">Owner only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-border/40 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={documents.length === 0 ? 'No documents yet' : 'No documents match your filters'}
          sub={documents.length === 0 ? 'Documents shared with the board will appear here.' : 'Try adjusting your search or filters.'}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => {
            const meta = fileMeta(doc.fileType);
            const access = doc.accessLevel ? ACCESS_META[doc.accessLevel] : null;
            const tags = doc.tags ?? [];
            return (
              <article
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className="group rounded-2xl border border-border/60 bg-card hover:border-sky-300 dark:hover:border-sky-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
              >
                <div className="p-4 flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <meta.Icon className={`h-5 w-5 ${meta.clr}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meta.lbl}</span>
                      {doc.version > 0 && (
                        <span className="text-[10px] font-semibold text-muted-foreground">· v{doc.version}</span>
                      )}
                      {access && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${access.chip}`}>
                          <access.Icon className="h-2.5 w-2.5" />
                          {access.label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                </div>

                {/* Meta strip */}
                <div className="px-4 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{formatSize(doc.fileSize)}</span>
                  <span>·</span>
                  <span title={doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : ''}>
                    {doc.uploadedAt
                      ? formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })
                      : '—'}
                  </span>
                  {doc.uploadedByName && (
                    <>
                      <span>·</span>
                      <span>by {doc.uploadedByName}</span>
                    </>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                    {tags.length > 4 && (
                      <span className="text-[10px] text-muted-foreground px-1">+{tags.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Action row */}
                <div className="px-4 pb-4 pt-1 border-t border-border/40 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs gap-1.5"
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-xl text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-60"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                  >
                    {downloadingId === doc.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />}
                    {downloadingId === doc.id ? 'Preparing…' : 'Download'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </MemberPortalLayout>
  );
}
