'use client';

/**
 * DocumentViewer
 * ──────────────
 * Renders INLINE (no modal) so the dashboard sidebar stays fully visible.
 *
 * How PDF rendering works (why previous attempts showed 404 / blank):
 * ─────────────────────────────────────────────────────────────────
 * The file URL is typically an authenticated endpoint on your own backend.
 * When you put that URL inside an <iframe src> or <object data>, the browser
 * makes a brand-new navigation request WITHOUT your app's session cookies
 * (same-origin cookies are blocked in sandboxed frames on many browsers).
 * The server then returns a 404 or 401 redirect — which is what you saw.
 *
 * The fix: fetch the binary via the standard Fetch API first (which DOES
 * send cookies via `credentials: 'include'`), convert it to a local
 * blob: URL, and render THAT blob URL inside an <embed>. The browser never
 * makes a network request for the embed — it reads from memory — so there is
 * no auth problem at all.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Document as DocType } from '@/types/api.types';
import documentsService from '@/api/services/documents.service';

import {
  ArrowLeft, ZoomIn, ZoomOut, Download, ExternalLink,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  FileText, FileSpreadsheet, Presentation, File,
  AlertTriangle, MoreVertical, Share2, Star, Printer,
  Info, Clock, HardDrive, Globe, Users, ShieldAlert, Lock,
  RefreshCw, X,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtSize(b: number): string {
  if (!b || b < 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(d: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

type FileKind = 'pdf' | 'office' | 'image' | 'unknown';

function getKind(typeOrUrl: string): FileKind {
  const t = (typeOrUrl ?? '').toLowerCase();
  if (t.includes('pdf')) return 'pdf';
  if (t.match(/\.(pdf)(\?|#|$)/)) return 'pdf';
  if (t.includes('word') || t.includes('document') || t.includes('sheet') ||
      t.includes('excel') || t.includes('presentation') || t.includes('powerpoint') ||
      t.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|#|$)/)) return 'office';
  if (t.includes('image') || t.match(/\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/)) return 'image';
  return 'unknown';
}

function getIcon(fileType: string) {
  const t = (fileType ?? '').toLowerCase();
  if (t.includes('pdf'))                                    return { Icon: FileText,        clr: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/40',        lbl: 'PDF'  };
  if (t.includes('word') || t.includes('document'))        return { Icon: FileText,        clr: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/40',       lbl: 'DOC'  };
  if (t.includes('sheet') || t.includes('excel'))          return { Icon: FileSpreadsheet, clr: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', lbl: 'XLS'  };
  if (t.includes('presentation') || t.includes('powerpoint')) return { Icon: Presentation, clr: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/40',  lbl: 'PPT'  };
  return                                                         { Icon: File,              clr: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',       lbl: 'FILE' };
}

const ACC: Record<string, { lbl: string; Icon: React.ElementType; cls: string }> = {
  VIEWER: { lbl: 'Viewer',     Icon: Globe,       cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  EDITOR: { lbl: 'Editor',     Icon: Users,       cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
  ADMIN:  { lbl: 'Admin Only', Icon: ShieldAlert, cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-emerald-800' },
  OWNER:  { lbl: 'Owner Only', Icon: Lock,        cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

// ─── Blob-fetch hook ─────────────────────────────────────────────────────────
// Fetches the file via the app's authenticated session (credentials: 'include')
// and returns a memory blob: URL. This bypasses all iframe/object auth issues.

type FetchState = 'idle' | 'fetching' | 'ready' | 'error';

function useBlob(url: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus]   = useState<FetchState>('idle');
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);
  const blobRef               = useRef<string | null>(null);

  const load = useCallback(() => {
    if (!url) { setStatus('idle'); return; }

    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('fetching');
    setErrMsg(null);
    setBlobUrl(null);

    fetch(url, { signal: ctrl.signal, credentials: 'include', cache: 'force-cache' })
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then(blob => {
        const isPdf = url.toLowerCase().includes('.pdf') ||
                      blob.type === 'application/pdf' ||
                      blob.type === 'application/octet-stream';
        const finalBlob = isPdf && blob.type !== 'application/pdf'
          ? new Blob([blob], { type: 'application/pdf' })
          : blob;
        const obj = URL.createObjectURL(finalBlob);
        blobRef.current = obj;
        setBlobUrl(obj);
        setStatus('ready');
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        setErrMsg(err?.message ?? 'Unknown error');
        setStatus('error');
      });
  }, [url]);

  useEffect(() => { load(); return () => { abortRef.current?.abort(); }; }, [load]);
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  return { blobUrl, status, errMsg, reload: load };
}

// ─── Shared UI pieces ────────────────────────────────────────────────────────

function Spinner({ msg = 'Loading document…' }: { msg?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95 z-20 pointer-events-none">
      <div className="relative w-11 h-11">
        <div className="absolute inset-0 rounded-full border-[3px] border-border" />
        <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{msg}</p>
    </div>
  );
}

function ErrState({ title, detail, doc, onRetry, downloadUrl }: {
  title?: string; detail?: string | null; doc: DocType; onRetry: () => void; downloadUrl?: string | null;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background z-20 px-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-destructive/60" />
      </div>
      <div className="max-w-sm">
        <p className="font-semibold text-foreground">{title ?? 'Could not display document'}</p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {detail ?? 'The file could not be loaded. It may require authentication, or the URL has expired.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />Retry
        </Button>
        {downloadUrl && (
          <Button size="sm" className="gap-1.5 h-9" onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-3.5 w-3.5" />Open in browser
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── PDF.js canvas renderer ───────────────────────────────────────────────────

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR');
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_CDN;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(s);
  });
}

function PdfViewer({ doc, zoom, refreshKey, downloadUrl }: { doc: DocType; zoom: number; refreshKey: number; downloadUrl?: string | null }) {
  const containerRef              = useRef<HTMLDivElement>(null);
  const canvasRefs                = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [numPages, setNumPages]   = useState(0);
  const [status, setStatus]       = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errMsg, setErrMsg]       = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(0);
  const pdfRef                    = useRef<any>(null);

  useEffect(() => {
    if (!downloadUrl) return;
    let cancelled = false;
    setStatus('loading');
    setErrMsg(null);
    setNumPages(0);
    canvasRefs.current.clear();

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const res = await fetch(downloadUrl, { credentials: 'include', cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setErrMsg(err?.message ?? 'Failed to load PDF');
        setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [downloadUrl, refreshKey, renderKey]);

  useEffect(() => {
    if (status !== 'ready' || !pdfRef.current || numPages === 0) return;
    const pdf = pdfRef.current;
    const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 2);
    const displayScale = zoom / 100;

    Array.from({ length: pdf.numPages }, (_, i) => i + 1).forEach(async (pageNum) => {
      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;
      try {
        const page     = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: displayScale * PIXEL_RATIO * 1.5 });
        const ctx      = canvas.getContext('2d')!;
        canvas.width        = viewport.width;
        canvas.height       = viewport.height;
        canvas.style.width  = `${viewport.width  / (PIXEL_RATIO * 1.5)}px`;
        canvas.style.height = `${viewport.height / (PIXEL_RATIO * 1.5)}px`;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch { /* skip failed page */ }
    });
  }, [status, numPages, zoom, canvasReady]);

  const retry = () => setRenderKey(k => k + 1);

  return (
    <div className="flex-1 relative overflow-auto bg-[#525659]" ref={containerRef}>
      {status === 'loading' && <Spinner msg="Rendering document…" />}
      {status === 'error'   && <ErrState doc={doc} detail={errMsg} onRetry={retry} downloadUrl={downloadUrl} />}

      {status === 'ready' && (
        <div className="flex flex-col items-center gap-4 py-6 px-4 min-h-full">
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              className="relative shadow-2xl bg-white rounded-sm overflow-hidden"
              style={{ width: '100%' }}
            >
              <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-medium tabular-nums select-none">
                {pageNum} / {numPages}
              </div>
              <canvas
                ref={el => {
                  if (el) {
                    canvasRefs.current.set(pageNum, el);
                    if (canvasRefs.current.size === numPages) {
                      setCanvasReady(k => k + 1);
                    }
                  } else {
                    canvasRefs.current.delete(pageNum);
                  }
                }}
                style={{ display: 'block', width: '100%' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Image renderer ─────────────────────────────────────────────────────────

function ImageViewer({ doc, zoom, refreshKey, downloadUrl }: { doc: DocType; zoom: number; refreshKey: number; downloadUrl?: string | null }) {
  const { blobUrl, status, errMsg, reload } = useBlob(downloadUrl);

  const prevRefresh = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey !== prevRefresh.current) { prevRefresh.current = refreshKey; reload(); }
  }, [refreshKey, reload]);

  return (
    <div className="flex-1 relative overflow-auto bg-muted/20 flex items-start justify-center p-8">
      {(status === 'idle' || status === 'fetching') && <Spinner msg="Loading image…" />}
      {status === 'error' && <ErrState doc={doc} detail={errMsg} onRetry={reload} downloadUrl={downloadUrl} />}
      {status === 'ready' && blobUrl && (
        <img
          src={blobUrl}
          alt={doc.title}
          className="max-w-full rounded-xl shadow-lg"
          style={{
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        />
      )}
    </div>
  );
}

// ─── Office renderer (Google Docs Viewer) ────────────────────────────────────

function OfficeViewer({ doc, refreshKey, downloadUrl }: { doc: DocType; refreshKey: number; downloadUrl?: string | null }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => setState('loading'), [doc.id, refreshKey, retry]);

  if (!downloadUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 bg-muted/10">
        <File className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No file URL available.</p>
      </div>
    );
  }

  const src = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`;

  return (
    <div className="flex-1 relative overflow-hidden bg-muted/5">
      {state === 'loading' && <Spinner msg="Loading via Google Docs Viewer…" />}
      {state === 'error' && (
        <ErrState
          doc={doc}
          title="Office preview unavailable"
          detail="Google Docs Viewer requires a publicly accessible URL. If your files are behind authentication, download the file instead."
          onRetry={() => setRetry(r => r + 1)}
          downloadUrl={downloadUrl}
        />
      )}
      <iframe
        key={`${doc.id}-${refreshKey}-${retry}`}
        src={src}
        title={doc.title}
        className="w-full h-full border-0"
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        allow="fullscreen"
      />
    </div>
  );
}

// ─── Unsupported ────────────────────────────────────────────────────────────

function UnsupportedViewer({ doc, downloadUrl }: { doc: DocType; downloadUrl?: string | null }) {
  const { Icon, clr, bg, lbl } = getIcon(doc.fileType ?? '');
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 bg-muted/10">
      <div className={`h-20 w-20 rounded-2xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-10 w-10 ${clr}`} />
      </div>
      <div>
        <p className="font-semibold text-foreground">{lbl} preview not supported</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
          This file type can't be previewed. Download it to open with a local application.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 h-9"
          onClick={() => {
            if (!downloadUrl) { toast.error('No download URL available'); return; }
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = doc.fileName ?? doc.title;
            a.click();
          }}>
          <Download className="h-3.5 w-3.5" />Download
        </Button>
        {downloadUrl && (
          <Button size="sm" className="gap-1.5 h-9" onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-3.5 w-3.5" />Open in browser
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────

function ViewerContent({ doc, zoom, refreshKey, downloadUrl }: { doc: DocType; zoom: number; refreshKey: number; downloadUrl?: string | null }) {
  const kind = getKind(doc.fileType ?? '') !== 'unknown'
    ? getKind(doc.fileType ?? '')
    : getKind(downloadUrl ?? '');

  if (kind === 'pdf')    return <PdfViewer    doc={doc} zoom={zoom} refreshKey={refreshKey} downloadUrl={downloadUrl} />;
  if (kind === 'image')  return <ImageViewer  doc={doc} zoom={zoom} refreshKey={refreshKey} downloadUrl={downloadUrl} />;
  if (kind === 'office') return <OfficeViewer doc={doc}             refreshKey={refreshKey} downloadUrl={downloadUrl} />;
  return <UnsupportedViewer doc={doc} downloadUrl={downloadUrl} />;
}

// ─── Info panel ────────────────────────────────────────────────────────────

function InfoPanel({ doc, onClose }: { doc: DocType; onClose: () => void }) {
  const { Icon, clr, bg, lbl } = getIcon(doc.fileType ?? '');
  const acc = ACC[doc.accessLevel ?? 'VIEWER'] ?? ACC.VIEWER;

  return (
    <aside className="w-64 shrink-0 border-l border-border/60 bg-background flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Details</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3 w-3" /></Button>
      </div>
      <div className="p-4 space-y-4 flex-1">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${bg}`}>
            <Icon className={`h-7 w-7 ${clr}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground line-clamp-3 leading-snug">{doc.title}</p>
            <Badge variant="outline" className="mt-1.5 text-[10px]">{lbl}</Badge>
          </div>
        </div>
        <div className="border-t border-border/50" />
        {([
          { l: 'File size',   v: fmtSize(doc.fileSize),     I: HardDrive },
          { l: 'Uploaded',    v: fmtDate(doc.uploadedAt),   I: Clock },
          { l: 'Uploaded by', v: doc.uploadedByName ?? '—', I: null },
          { l: 'Version',     v: doc.version ? `v${doc.version}` : 'v1', I: null },
        ] as { l: string; v: string; I: React.ElementType | null }[]).map(({ l, v, I }) => (
          <div key={l} className="flex items-start gap-2.5">
            <div className="w-3.5 mt-0.5 shrink-0">{I && <I className="h-3.5 w-3.5 text-muted-foreground" />}</div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{l}</p>
              <p className="text-xs text-foreground mt-0.5 break-words leading-snug">{v}</p>
            </div>
          </div>
        ))}
        <div className="flex items-start gap-2.5">
          <acc.Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Access</p>
            <Badge variant="outline" className={`text-xs mt-1 ${acc.cls}`}>{acc.lbl}</Badge>
          </div>
        </div>
        {doc.description && (
          <div className="flex items-start gap-2.5">
            <div className="w-3.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Description</p>
              <p className="text-xs text-foreground mt-0.5 leading-relaxed">{doc.description}</p>
            </div>
          </div>
        )}
        {(doc.tags?.length ?? 0) > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="w-3.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tags</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {doc.tags!.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t}</Badge>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────

interface TBProps {
  doc: DocType; zoom: number; showInfo: boolean; isFullscreen: boolean;
  allDocs: DocType[]; currentIdx: number;
  onZoomIn(): void; onZoomOut(): void; onZoomReset(): void;
  onRefresh(): void; onDownload(): void; onOpenExternal(): void;
  onToggleInfo(): void; onToggleFullscreen(): void;
  onClose(): void; onNavigate(d: DocType): void;
}

function Toolbar(p: TBProps) {
  const { Icon, clr, bg, lbl } = getIcon(p.doc.fileType ?? '');
  const hasPrev = p.currentIdx > 0;
  const hasNext = p.currentIdx >= 0 && p.currentIdx < p.allDocs.length - 1;

  return (
    <header className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-background shrink-0 min-h-[52px]">
      {/* Back */}
      <Button variant="ghost" size="sm"
        className="h-8 gap-1.5 px-2.5 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
        onClick={p.onClose}>
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="text-xs hidden sm:inline font-medium">Documents</span>
      </Button>

      <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />

      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${clr}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{p.doc.title}</p>
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          {lbl} · {fmtSize(p.doc.fileSize)} · {fmtDate(p.doc.uploadedAt)}
        </p>
      </div>

      {/* Doc nav */}
      {p.allDocs.length > 1 && (
        <div className="hidden sm:flex items-center gap-0.5 border border-border/60 rounded-lg px-1 py-0.5 bg-muted/20 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" disabled={!hasPrev}
            onClick={() => hasPrev && p.onNavigate(p.allDocs[p.currentIdx - 1])}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[11px] text-muted-foreground px-1 tabular-nums font-medium whitespace-nowrap">
            {p.currentIdx + 1} / {p.allDocs.length}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" disabled={!hasNext}
            onClick={() => hasNext && p.onNavigate(p.allDocs[p.currentIdx + 1])}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Zoom */}
      <div className="flex items-center gap-0.5 border border-border/60 rounded-lg px-1 py-0.5 bg-muted/20 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" disabled={p.zoom <= 50} onClick={p.onZoomOut}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <button onClick={p.onZoomReset}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-1.5 tabular-nums w-10 text-center">
          {p.zoom}%
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" disabled={p.zoom >= 200} onClick={p.onZoomIn}>
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={p.onRefresh} title="Reload">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon"
          className={`h-8 w-8 rounded-lg transition-colors ${p.showInfo ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={p.onToggleInfo} title="Details">
          <Info className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={p.onDownload} title="Download">
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={p.onToggleFullscreen} title={p.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {p.isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Overflow */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="md:hidden" onClick={p.onRefresh}><RefreshCw className="mr-2 h-4 w-4" />Reload</DropdownMenuItem>
          <DropdownMenuItem className="md:hidden" onClick={p.onToggleInfo}><Info className="mr-2 h-4 w-4" />{p.showInfo ? 'Hide details' : 'Show details'}</DropdownMenuItem>
          <DropdownMenuItem className="md:hidden" onClick={p.onDownload}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
          <DropdownMenuItem className="md:hidden" onClick={p.onToggleFullscreen}>
            {p.isFullscreen ? <><Minimize2 className="mr-2 h-4 w-4" />Exit fullscreen</> : <><Maximize2 className="mr-2 h-4 w-4" />Fullscreen</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem onClick={p.onOpenExternal}><ExternalLink className="mr-2 h-4 w-4" />Open in browser</DropdownMenuItem>
          <DropdownMenuItem><Printer className="mr-2 h-4 w-4" />Print</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Star className="mr-2 h-4 w-4" />Favourite</DropdownMenuItem>
          <DropdownMenuItem><Share2 className="mr-2 h-4 w-4" />Share link</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────

interface DocumentViewerProps {
  doc: DocType;
  allDocs?: DocType[];
  onClose: () => void;
}

export function DocumentViewer({ doc, allDocs = [], onClose }: DocumentViewerProps) {
  const [zoom, setZoom]                   = useState(100);
  const [showInfo, setShowInfo]           = useState(false);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0);
  const [currentDocId, setCurrentDocId]   = useState(doc.id);
  const [downloadUrl, setDownloadUrl]     = useState<string | null>(null);

  useEffect(() => {
    if (doc.id !== currentDocId) {
      setCurrentDocId(doc.id);
      setZoom(100);
      setRefreshKey(k => k + 1);
      setShowInfo(false);
    }
  }, [doc.id]);

  const currentDoc = allDocs.find(d => d.id === currentDocId) ?? doc;
  const currentIdx = allDocs.findIndex(d => d.id === currentDocId);

  useEffect(() => {
    let cancelled = false;
    documentsService.getDownloadurl(currentDoc.id)
      .then(url => {
        if (!cancelled) setDownloadUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDownloadUrl(null);
      });
    return () => { cancelled = true; };
  }, [currentDoc.id, currentDoc.downloadUrl]);

  const navigateTo = useCallback((target: DocType) => {
    setCurrentDocId(target.id);
    setZoom(100);
    setRefreshKey(k => k + 1);
    setShowInfo(false);
  }, []);

  const handleDownload = () => {
    if (!downloadUrl) { toast.error('No download URL available'); return; }
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = currentDoc.fileName ?? currentDoc.title;
    a.click();
    toast.success('Download started', { description: currentDoc.title });
  };

  const tbProps: TBProps = {
    doc: currentDoc, zoom, showInfo, isFullscreen, allDocs, currentIdx,
    onZoomIn:           () => setZoom(z => Math.min(z + 25, 200)),
    onZoomOut:          () => setZoom(z => Math.max(z - 25, 50)),
    onZoomReset:        () => setZoom(100),
    onRefresh:          () => setRefreshKey(k => k + 1),
    onDownload:         handleDownload,
    onOpenExternal:     () => downloadUrl && window.open(downloadUrl, '_blank', 'noopener,noreferrer'),
    onToggleInfo:       () => setShowInfo(v => !v),
    onToggleFullscreen: () => setIsFullscreen(v => !v),
    onClose,
    onNavigate:         navigateTo,
  };

  const shell = (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex flex-col bg-background'
          : 'flex flex-col w-full rounded-xl border border-border/60 shadow-sm overflow-hidden bg-background'
      }
      style={!isFullscreen ? { height: 'calc(100vh - 130px)', minHeight: 520 } : undefined}
    >
      <Toolbar {...tbProps} />

      {/* Mobile doc nav strip */}
      {allDocs.length > 1 && (
        <div className="flex sm:hidden items-center justify-between px-4 py-1.5 border-b border-border/40 bg-muted/20 text-xs text-muted-foreground shrink-0">
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs"
            disabled={currentIdx <= 0}
            onClick={() => currentIdx > 0 && navigateTo(allDocs[currentIdx - 1])}>
            <ChevronLeft className="h-3 w-3" />Prev
          </Button>
          <span className="tabular-nums font-medium">{currentIdx + 1} of {allDocs.length}</span>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs"
            disabled={currentIdx >= allDocs.length - 1}
            onClick={() => currentIdx < allDocs.length - 1 && navigateTo(allDocs[currentIdx + 1])}>
            Next<ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Content + optional info panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ViewerContent doc={currentDoc} zoom={zoom} refreshKey={refreshKey} downloadUrl={downloadUrl} />
        {showInfo && <InfoPanel doc={currentDoc} onClose={() => setShowInfo(false)} />}
      </div>

      {/* Status bar */}
      <footer className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-border/40 bg-muted/20 shrink-0">
        <p className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
          {currentDoc.fileName ?? currentDoc.title}
        </p>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] text-muted-foreground shrink-0">
          {currentDoc.uploadedByName && <span className="hidden sm:inline">by {currentDoc.uploadedByName}</span>}
          <span>{fmtDate(currentDoc.uploadedAt)}</span>
          <span>{fmtSize(currentDoc.fileSize)}</span>
        </div>
      </footer>
    </div>
  );

  return shell;
}

export default DocumentViewer;