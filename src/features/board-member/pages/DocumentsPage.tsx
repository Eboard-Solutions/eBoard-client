'use client';

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { FileText, Filter, Eye, Download, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocuments, useUpdateDocument, useCurrentUser } from '@/hooks/api';
import type { Document } from '../types';
import { PageHeader, SearchBar, EmptyState, unwrapList } from '../components/page-helpers';

export function DocumentsPage() {
  const { data: documentsData } = useDocuments();
  const updateDocument = useUpdateDocument();
  const { data: currentUser } = useCurrentUser();

  const documents = useMemo(() => unwrapList<Document>(documentsData), [documentsData]);
  const userId = currentUser?.userId ?? 'unknown';
  const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'User';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Document | null>(null);
  const [newNote, setNewNote] = useState('');

  const CAT_COLORS: Record<string, string> = {
    BOARD_PACK: 'bg-indigo-100 text-indigo-700',
    MINUTES: 'bg-violet-100 text-violet-700',
    AGENDA: 'bg-sky-100 text-sky-700',
    REPORT: 'bg-emerald-100 text-emerald-700',
    POLICY: 'bg-amber-100 text-amber-700',
    FINANCIAL: 'bg-orange-100 text-orange-700',
    LEGAL: 'bg-red-100 text-red-700',
    OTHER: 'bg-slate-100 text-slate-600',
  };

  const filtered = useMemo(
    () =>
      documents
        .filter((d) => {
          const tags = d.tags ?? [];
          return (
            (!search || d.title.toLowerCase().includes(search.toLowerCase()) || tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) &&
            (category === 'all' || d.category === category)
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [documents, search, category],
  );

  function formatSize(b: number) {
    if (b < 1024) return `${b}B`;
    if (b < 1_048_576) return `${(b / 1024).toFixed(0)}KB`;
    return `${(b / 1_048_576).toFixed(1)}MB`;
  }

  function addAnnotation(docId: string, text: string) {
    updateDocument.mutate({ id: docId, data: { annotations: [{ annotationId: 'new', documentId: docId, userId, userName, text, createdAt: new Date().toISOString() }] as any } });
  }

  function deleteAnnotation(docId: string, annotationId: string) {
    updateDocument.mutate({ id: docId, data: { removeAnnotationId: annotationId } as any });
  }

  function downloadDocument(docId: string) {
    window.open(`/api/v1/documents/${docId}/download-url`, '_blank');
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={FileText} title="Documents" color="bg-sky-600" subtitle="Board packs, policies, reports and more" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search documents…" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-44 text-sm shrink-0">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['all', 'BOARD_PACK', 'MINUTES', 'AGENDA', 'REPORT', 'POLICY', 'FINANCIAL', 'LEGAL', 'OTHER'].map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? 'All categories' : c.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents found" />
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const categoryLabel = (doc.category ?? 'OTHER').replace('_', ' ');
            const tags = doc.tags ?? [];
            return (
              <div key={doc.documentId} className={`rounded-2xl border border-border/60 bg-card hover:shadow-md transition-all duration-200 overflow-hidden ${doc.isConfidential ? 'border-amber-200 dark:border-amber-800' : ''}`}>
                <div className="flex items-start gap-4 p-4">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[doc.category ?? 'OTHER'] ?? CAT_COLORS.OTHER}`}>{categoryLabel}</span>
                          {doc.isConfidential && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700"><Lock className="h-2.5 w-2.5" />Confidential</span>}
                          <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{doc.title}</h3>
                        {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatSize(doc.fileSize)}</span>
                          <span>{doc.fileType}</span>
                          <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{doc.viewCount}</span>
                          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{doc.downloadCount}</span>
                        </div>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.map((t) => (
                              <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setSelected(doc)}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { downloadDocument(doc.documentId); toast.success('Download started'); }}>
                          <Download className="h-3.5 w-3.5" />Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* dialog unchanged */}
    </div>
  );
}