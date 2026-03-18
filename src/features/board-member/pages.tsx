'use client';
// ─────────────────────────────────────────────────────────────────────────────
// This file contains ALL board-member feature pages.
// Each page is a named export. Import from './pages'.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { format, isPast, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import {
  CalendarDays, FileText, CheckSquare, Vote, BarChart3,
  Megaphone, MessageSquare, Bell, Shield, Target, Search,
  Filter, X, Plus, ChevronDown, ChevronUp, Download, Eye,
  Edit3, Trash2, MoreHorizontal, CheckCircle2, XCircle,
  MinusCircle, Clock, MapPin, Users, Pin, Send, Lock,
  Award, TrendingUp, Activity, AlertCircle, Paperclip,
  RefreshCcw, BookOpen, Archive, Star, Hash, Video,
  ExternalLink, Check, Link as LinkIcon,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch }   from '@/components/ui/switch';
import { Badge }    from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

import {
  useMeetings, useTasks, useResolutions, useDocuments,
  usePolls, useAnnouncements, useMessages, useNotifications,
  useProfile, useCompliance, useAnalytics,
} from './useBoardStore';
import { uid, CURRENT_USER } from './store';
import type { Meeting, Task, Document, Resolution, Poll } from './types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PageHeader({ icon: Icon, title, subtitle, color }: { icon: React.ElementType; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-0 max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-9 pl-9 pr-8 text-sm" />
      {value && <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="py-20 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10">
      <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── MEETINGS PAGE ────────────────────────────────────────────────────────────

export function MeetingsPage() {
  const { meetings, rsvp }    = useMeetings();
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<Meeting | null>(null);

  const now = new Date();

  const filtered = useMemo(() =>
    meetings.filter(m => {
      const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.location.toLowerCase().includes(search.toLowerCase());
      const isUpcoming = new Date(m.scheduledAt) >= now || m.status === 'IN_PROGRESS';
      return matchSearch && (tab === 'upcoming' ? isUpcoming : !isUpcoming);
    }).sort((a, b) => tab === 'upcoming'
      ? new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      : new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    ), [meetings, search, tab]);

  const TYPE_COLORS: Record<string, string> = {
    BOARD: 'bg-indigo-100 text-indigo-700', COMMITTEE: 'bg-sky-100 text-sky-700',
    ANNUAL: 'bg-violet-100 text-violet-700', SPECIAL: 'bg-amber-100 text-amber-700', EMERGENCY: 'bg-red-100 text-red-700',
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={CalendarDays} title="Meetings" color="bg-indigo-600" subtitle="Board and committee meeting schedule" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search meetings…" />
      </div>

      <div className="flex items-center gap-1 border-b border-border/60 mb-5">
        {(['upcoming', 'past'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon={CalendarDays} title={`No ${tab} meetings`} /> : (
        <div className="space-y-3">
          {filtered.map(m => {
            const isT = isToday(new Date(m.scheduledAt));
            const isTo = isTomorrow(new Date(m.scheduledAt));
            return (
              <div key={m.meetingId}
                className={`rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden ${isT ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/10' : 'border-border/60 bg-card'}`}
                onClick={() => setSelected(m)}
              >
                <div className={`h-0.5 ${m.status === 'COMPLETED' ? 'bg-slate-300' : m.status === 'CANCELLED' ? 'bg-red-400' : 'bg-indigo-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`shrink-0 rounded-xl p-2.5 text-center min-w-[52px] ${isT || isTo ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}>
                        <p className="text-[9px] font-bold uppercase">{format(new Date(m.scheduledAt), 'MMM')}</p>
                        <p className="text-xl font-black leading-none">{format(new Date(m.scheduledAt), 'd')}</p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.BOARD}`}>{m.meetingType}</span>
                          {(isT || isTo) && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{isT ? 'Today' : 'Tomorrow'}</span>}
                          {m.status !== 'SCHEDULED' && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">{m.status}</span>}
                        </div>
                        <h3 className="font-semibold text-foreground">{m.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(m.scheduledAt), 'h:mm a')}</span>
                          {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.attendees.length} attendees</span>
                        </div>
                      </div>
                    </div>
                    {m.status === 'SCHEDULED' && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {(['ACCEPTED', 'TENTATIVE', 'DECLINED'] as const).map(s => (
                          <button key={s} type="button"
                            onClick={() => { rsvp(m.meetingId, s); toast.success(`RSVP updated: ${s}`); }}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${m.myRsvp === s
                              ? s === 'ACCEPTED' ? 'bg-emerald-600 text-white border-emerald-600' : s === 'DECLINED' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'
                              : 'border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600'}`}
                          >{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{format(new Date(selected.scheduledAt), 'EEEE, MMMM d yyyy')} · {format(new Date(selected.scheduledAt), 'h:mm a')} – {format(new Date(selected.endTime), 'h:mm a')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                    <p className="font-medium">{selected.location || '—'}</p>
                  </div>
                  {selected.meetingLink && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Virtual Link</p>
                      <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 flex items-center gap-1 text-sm font-medium hover:underline"><Video className="h-3.5 w-3.5" />Join Meeting</a>
                    </div>
                  )}
                </div>

                {selected.agenda.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Agenda ({selected.agenda.length} items)</h4>
                    <div className="space-y-1.5">
                      {selected.agenda.map((item, i) => (
                        <div key={item.agendaId} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-muted/20">
                          <span className="shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{item.title}</p>
                            {item.presenter && <p className="text-xs text-muted-foreground">Presenter: {item.presenter} · {item.duration}min</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.attendees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Attendees</h4>
                    <div className="flex flex-wrap gap-2">
                      {selected.attendees.map(a => (
                        <span key={a.userId} className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.rsvpStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : a.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                          {a.name} · {a.rsvpStatus}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.minutes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Minutes</h4>
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 whitespace-pre-line">{selected.minutes}</div>
                  </div>
                )}

                {selected.postMeetingSummary && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Post-Meeting Summary</h4>
                    <div className="text-sm text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">{selected.postMeetingSummary}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {selected.meetingLink && selected.status === 'IN_PROGRESS' && (
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" />Join Live Meeting</a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── DOCUMENTS PAGE ───────────────────────────────────────────────────────────

export function DocumentsPage() {
  const { documents, viewDocument, downloadDocument, addAnnotation, deleteAnnotation } = useDocuments();
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Document | null>(null);
  const [newNote,  setNewNote]  = useState('');

  const CAT_COLORS: Record<string, string> = {
    BOARD_PACK: 'bg-indigo-100 text-indigo-700', MINUTES: 'bg-violet-100 text-violet-700',
    AGENDA: 'bg-sky-100 text-sky-700', REPORT: 'bg-emerald-100 text-emerald-700',
    POLICY: 'bg-amber-100 text-amber-700', FINANCIAL: 'bg-orange-100 text-orange-700',
    LEGAL: 'bg-red-100 text-red-700', OTHER: 'bg-slate-100 text-slate-600',
  };

  const filtered = useMemo(() =>
    documents.filter(d =>
      (!search || d.title.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) &&
      (category === 'all' || d.category === category)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [documents, search, category]
  );

  function formatSize(b: number) {
    if (b < 1024) return `${b}B`; if (b < 1_048_576) return `${(b/1024).toFixed(0)}KB`; return `${(b/1_048_576).toFixed(1)}MB`;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={FileText} title="Documents" color="bg-sky-600" subtitle="Board packs, policies, reports and more" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search documents…" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-44 text-sm shrink-0"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all','BOARD_PACK','MINUTES','AGENDA','REPORT','POLICY','FINANCIAL','LEGAL','OTHER'].map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All categories' : c.replace('_',' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={FileText} title="No documents found" /> : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.documentId} className={`rounded-2xl border border-border/60 bg-card hover:shadow-md transition-all duration-200 overflow-hidden ${doc.isConfidential ? 'border-amber-200 dark:border-amber-800' : ''}`}>
              <div className="flex items-start gap-4 p-4">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[doc.category] ?? CAT_COLORS.OTHER}`}>{doc.category.replace('_',' ')}</span>
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
                      {doc.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{doc.tags.map(t => <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>)}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                        onClick={() => { viewDocument(doc.documentId); setSelected(doc); }}>
                        <Eye className="h-3.5 w-3.5" />View
                      </Button>
                      <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => { downloadDocument(doc.documentId); toast.success('Download started'); }}>
                        <Download className="h-3.5 w-3.5" />Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setNewNote(''); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.fileType} · Version {selected.version} · Uploaded by {selected.uploadedBy}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-10 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Document preview would appear here</p>
                  <p className="text-xs text-muted-foreground mt-1">({selected.fileType} · {(selected.fileSize/1_048_576).toFixed(1)}MB)</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => { downloadDocument(selected.documentId); toast.success('Download started'); }}>
                    <Download className="h-3.5 w-3.5" />Download to View
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Annotations ({selected.annotations.length})</h4>
                  <div className="space-y-2 mb-3">
                    {selected.annotations.map(ann => (
                      <div key={ann.annotationId} className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{ann.userName[0]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">{ann.userName}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</p>
                              {ann.userId === CURRENT_USER.userId && (
                                <button type="button" onClick={() => { deleteAnnotation(selected.documentId, ann.annotationId); setSelected({ ...selected, annotations: selected.annotations.filter(a => a.annotationId !== ann.annotationId) }); toast.success('Annotation deleted'); }}
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{ann.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add an annotation…" className="h-9 text-sm flex-1"
                      onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) { addAnnotation(selected.documentId, newNote.trim()); setSelected({ ...selected, annotations: [...selected.annotations, { annotationId: uid(), documentId: selected.documentId, userId: CURRENT_USER.userId, userName: CURRENT_USER.name, text: newNote.trim(), createdAt: new Date().toISOString() }] }); setNewNote(''); toast.success('Annotation added'); }}} />
                    <Button size="sm" className="h-9" onClick={() => { if (newNote.trim()) { addAnnotation(selected.documentId, newNote.trim()); setNewNote(''); toast.success('Annotation added'); setSelected(prev => prev ? { ...prev, annotations: [...prev.annotations, { annotationId: uid(), documentId: prev.documentId, userId: CURRENT_USER.userId, userName: CURRENT_USER.name, text: newNote.trim(), createdAt: new Date().toISOString() }] } : null); } }}>Add</Button>
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => { setSelected(null); setNewNote(''); }}>Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── RESOLUTIONS PAGE ─────────────────────────────────────────────────────────

export function ResolutionsPage() {
  const { resolutions, castVote } = useResolutions();
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('all');
  const [voteTarget, setVoteTarget] = useState<Resolution | null>(null);
  const [choice, setChoice]       = useState<'FOR'|'AGAINST'|'ABSTAIN'|null>(null);
  const [comment, setComment]     = useState('');

  const filtered = useMemo(() =>
    resolutions.filter(r =>
      (!search || r.title.toLowerCase().includes(search.toLowerCase())) &&
      (status === 'all' || r.status === status)
    ).sort((a, b) => {
      if (a.status === 'OPEN' && !a.myVote && !(b.status === 'OPEN' && !b.myVote)) return -1;
      if (b.status === 'OPEN' && !b.myVote && !(a.status === 'OPEN' && !a.myVote)) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [resolutions, search, status]);

  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700', PASSED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700', DEFERRED: 'bg-blue-100 text-blue-700',
    DRAFT: 'bg-slate-100 text-slate-600', WITHDRAWN: 'bg-slate-100 text-slate-400',
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={Vote} title="Resolutions" color="bg-amber-500" subtitle="Board resolutions and voting" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search resolutions…" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all','OPEN','PASSED','REJECTED','DEFERRED','DRAFT'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={Vote} title="No resolutions found" /> : (
        <div className="space-y-4">
          {filtered.map(r => {
            const total = r.votesFor + r.votesAgainst + r.abstentions;
            const forPct = total > 0 ? Math.round((r.votesFor / total) * 100) : 0;
            const agPct  = total > 0 ? Math.round((r.votesAgainst / total) * 100) : 0;
            const canVote = r.status === 'OPEN' && !r.myVote;

            return (
              <div key={r.resolutionId} className={`rounded-2xl border transition-all hover:shadow-md ${r.status === 'OPEN' && !r.myVote ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10' : 'border-border/60 bg-card'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT}`}>{r.status}</span>
                        {r.status === 'OPEN' && !r.myVote && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><AlertCircle className="h-2.5 w-2.5" />Your vote needed</span>}
                        {r.myVote && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-2.5 w-2.5" />Voted · {r.myVote}</span>}
                      </div>
                      <h3 className="font-semibold text-foreground">{r.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-muted-foreground">
                        <span>Proposed by {r.proposedBy}</span>
                        {r.secondedBy && <span>· Seconded by {r.secondedBy}</span>}
                        {r.votingDeadline && <span>· Deadline: {formatDistanceToNow(new Date(r.votingDeadline), { addSuffix: true })}</span>}
                      </div>
                    </div>
                    {canVote && <Button size="sm" className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => { setVoteTarget(r); setChoice(null); setComment(''); }}><Vote className="h-3.5 w-3.5" />Vote</Button>}
                  </div>

                  {/* Vote bar */}
                  {total > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/40">
                      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                        {forPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${forPct}%` }} />}
                        {agPct  > 0 && <div className="bg-red-500 transition-all"     style={{ width: `${agPct}%` }} />}
                        {(100-forPct-agPct) > 0 && <div className="bg-slate-300 dark:bg-slate-600 transition-all" style={{ width: `${100-forPct-agPct}%` }} />}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{r.votesFor} For</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{r.votesAgainst} Against</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{r.abstentions} Abstain</span>
                        <span>· {r.totalVotes}/{r.quorumRequired} quorum</span>
                      </div>
                    </div>
                  )}

                  {r.outcome && <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300">{r.outcome}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vote dialog */}
      <Dialog open={!!voteTarget} onOpenChange={o => { if (!o) setVoteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Vote className="h-5 w-5 text-amber-500" />Cast Your Vote</DialogTitle>
            <DialogDescription className="line-clamp-3">{voteTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{voteTarget?.description}</p>
            <div className="grid grid-cols-3 gap-3">
              {([['FOR', CheckCircle2, 'border-emerald-300 bg-emerald-50 text-emerald-700'], ['AGAINST', XCircle, 'border-red-300 bg-red-50 text-red-700'], ['ABSTAIN', MinusCircle, 'border-slate-300 bg-slate-50 text-slate-600']] as const).map(([v, Icon, cls]) => (
                <button key={v} type="button" onClick={() => setChoice(v)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${choice === v ? cls + ' ring-2 ring-offset-1 ring-current' : 'border-border hover:border-border/80 bg-background'}`}>
                  <Icon className="h-6 w-6" /><span className="text-sm font-semibold">{v}</span>
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional comment…" rows={3} className="text-sm resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteTarget(null)}>Cancel</Button>
            <Button disabled={!choice} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
              if (!choice || !voteTarget) return;
              castVote(voteTarget.resolutionId, choice, comment.trim() || undefined);
              toast.success(`Vote cast: ${choice}`);
              setVoteTarget(null);
            }}><Vote className="h-4 w-4" />Confirm Vote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TASKS PAGE ───────────────────────────────────────────────────────────────

export function TasksPage() {
  const { tasks, updateTask, updateProgress, addDeliverable, deleteTask } = useTasks();
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('active');
  const [selected, setSelected] = useState<Task | null>(null);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [progressInput, setProgressInput]   = useState<number>(0);

  const filtered = useMemo(() =>
    tasks.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' ? true : filter === 'active' ? t.status !== 'COMPLETED' : t.status === filter;
      return matchSearch && matchFilter;
    }).sort((a, b) => {
      const p = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
    }), [tasks, search, filter]);

  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-slate-100 text-slate-600',
  };

  const STATUS_DOT: Record<string, string> = {
    OVERDUE: 'bg-red-500', IN_PROGRESS: 'bg-blue-500',
    COMPLETED: 'bg-emerald-500', PENDING: 'bg-amber-500',
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={CheckSquare} title="My Tasks" color="bg-emerald-600" subtitle="Action items and deliverables" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={CheckSquare} title={filter === 'active' ? 'All caught up!' : 'No tasks found'} sub={filter === 'active' ? 'No active tasks assigned to you.' : undefined} /> : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.taskId} className={`rounded-2xl border transition-all hover:shadow-md cursor-pointer ${t.status === 'OVERDUE' ? 'border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10' : t.status === 'COMPLETED' ? 'border-border/40 opacity-70' : 'border-border/60 bg-card'}`}
              onClick={() => { setSelected(t); setProgressInput(t.progress); }}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${STATUS_DOT[t.status]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                          {t.status === 'OVERDUE' && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
                        </div>
                        <p className={`font-semibold text-sm ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {t.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {isToday(new Date(t.dueDate)) ? 'Today' : format(new Date(t.dueDate), 'MMM d')}</span>}
                          <span>Assigned by {t.assignedBy}</span>
                          {t.deliverables.length > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{t.deliverables.length}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {t.status !== 'COMPLETED' && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { updateProgress(t.taskId, 100, 'COMPLETED'); toast.success('Task completed!'); }}>Done</Button>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${t.status === 'OVERDUE' ? 'bg-red-500' : t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{t.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setNewDeliverable(''); } }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>Assigned by {selected.assignedBy}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress — {progressInput}%</Label>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={progressInput}
                    onChange={e => setProgressInput(Number(e.target.value))}
                    className="w-full accent-indigo-600" />
                  <Button size="sm" className="mt-2 h-8 text-xs w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                    updateProgress(selected.taskId, progressInput);
                    setSelected(prev => prev ? { ...prev, progress: progressInput, status: progressInput === 100 ? 'COMPLETED' : progressInput > 0 ? 'IN_PROGRESS' : 'PENDING' } : null);
                    toast.success('Progress updated');
                  }}>Update Progress</Button>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Notes</Label>
                  <Textarea defaultValue={selected.notes} rows={3} className="text-sm resize-none"
                    onBlur={e => { updateTask(selected.taskId, { notes: e.target.value }); }} placeholder="Add notes…" />
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deliverables ({selected.deliverables.length})</h4>
                  <div className="space-y-2 mb-2">
                    {selected.deliverables.map(d => (
                      <div key={d.deliverableId} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1">{d.title}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(d.submittedAt), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newDeliverable} onChange={e => setNewDeliverable(e.target.value)} placeholder="Add deliverable…" className="h-8 text-sm flex-1" />
                    <Button size="sm" className="h-8" onClick={() => { if (newDeliverable.trim()) { addDeliverable(selected.taskId, newDeliverable.trim()); setNewDeliverable(''); toast.success('Deliverable added'); } }}>Add</Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setSelected(null); setNewDeliverable(''); }}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── POLLS PAGE ───────────────────────────────────────────────────────────────

export function PollsPage() {
  const { polls, respond } = usePolls();
  const [selected, setSelected] = useState<string[]>([]);
  const [activePollId, setActivePollId] = useState<string | null>(null);

  const active = polls.filter(p => p.status === 'ACTIVE');
  const closed = polls.filter(p => p.status !== 'ACTIVE');

  function PollCard({ poll }: { poll: Poll }) {
    const [myChoice, setMyChoice] = useState<string[]>(poll.myResponse ?? []);
    const total = poll.totalResponses;
    const hasVoted = (poll.myResponse ?? []).length > 0;

    return (
      <div className={`rounded-2xl border transition-all hover:shadow-md ${poll.status === 'ACTIVE' && !hasVoted ? 'border-violet-200 dark:border-violet-800 bg-violet-50/20 dark:bg-violet-950/10' : 'border-border/60 bg-card'}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${poll.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{poll.status}</span>
                {poll.isAnonymous && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Anonymous</span>}
              </div>
              <h3 className="font-semibold text-foreground">{poll.question}</h3>
              {poll.description && <p className="text-xs text-muted-foreground mt-0.5">{poll.description}</p>}
            </div>
          </div>

          <div className="space-y-2.5">
            {poll.options.map(opt => {
              const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
              const isChosen = myChoice.includes(opt.optionId);
              const canVote = poll.status === 'ACTIVE' && !hasVoted;
              return (
                <div key={opt.optionId}>
                  {canVote ? (
                    <button type="button" onClick={() => {
                      if (poll.pollType === 'SINGLE') setMyChoice([opt.optionId]);
                      else setMyChoice(prev => prev.includes(opt.optionId) ? prev.filter(id => id !== opt.optionId) : [...prev, opt.optionId]);
                    }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${isChosen ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-medium' : 'border-border hover:border-indigo-300 bg-background'}`}
                    >{opt.label}</button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={isChosen ? 'font-semibold text-indigo-600' : 'text-foreground'}>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{pct}% ({opt.votes})</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isChosen ? 'bg-indigo-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {poll.status === 'ACTIVE' && !hasVoted && myChoice.length > 0 && (
            <Button className="mt-4 w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => { respond(poll.pollId, myChoice); toast.success('Response submitted!'); }}>
              Submit Response
            </Button>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{total} response{total !== 1 ? 's' : ''}</span>
            {poll.deadline && <span>Deadline: {format(new Date(poll.deadline), 'MMM d, yyyy')}</span>}
          </div>

          {!poll.isAnonymous && poll.auditTrail.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />Audit Trail ({poll.auditTrail.length})</summary>
              <div className="mt-2 space-y-1">
                {poll.auditTrail.slice(0, 5).map(e => (
                  <div key={e.entryId} className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium">{e.userName}</span> {e.action} · {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                    {e.details && <p className="text-[10px] mt-0.5">{e.details}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 md:px-6 py-8">
      <PageHeader icon={BarChart3} title="Polls & Voting" color="bg-violet-600" subtitle="Active polls and voting history" />
      {polls.length === 0 ? <EmptyState icon={BarChart3} title="No polls available" /> : (
        <div className="space-y-6">
          {active.length > 0 && (<div className="space-y-4"><h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active · {active.length}</h2>{active.map(p => <PollCard key={p.pollId} poll={p} />)}</div>)}
          {closed.length > 0 && (<div className="space-y-4"><h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Closed · {closed.length}</h2>{closed.map(p => <PollCard key={p.pollId} poll={p} />)}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── ANNOUNCEMENTS PAGE ───────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const { announcements, markRead, markAllRead } = useAnnouncements();
  const [filter, setFilter] = useState<'all'|'unread'>('unread');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() =>
    [...announcements]
      .filter(a => filter === 'all' || !a.isRead)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const pOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      }), [announcements, filter]);

  const unreadCount = announcements.filter(a => !a.isRead).length;
  const PRIORITY_COLORS: Record<string, string> = { URGENT: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-slate-100 text-slate-500' };

  return (
    <div className="container mx-auto max-w-3xl px-4 md:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader icon={Megaphone} title="Announcements" color="bg-rose-500" subtitle="Board notices and updates" />
        {unreadCount > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0 mt-1" onClick={() => { markAllRead(); toast.success('All marked as read'); }}><CheckCircle2 className="h-3.5 w-3.5" />Mark all read</Button>}
      </div>

      <div className="flex items-center gap-1 border-b border-border/60 mb-5">
        {(['unread', 'all'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${filter === f ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >{f === 'unread' ? `Unread (${unreadCount})` : 'All'}</button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon={Bell} title={filter === 'unread' ? 'All caught up!' : 'No announcements'} /> : (
        <div className="space-y-2">
          {filtered.map(ann => {
            const isExpanded = expanded.has(ann.announcementId);
            const isLong = ann.content.length > 200;
            return (
              <div key={ann.announcementId} className={`relative rounded-2xl border transition-all ${!ann.isRead ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' : 'border-border/60 bg-card hover:bg-muted/20'}`}>
                {ann.isPinned && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-full ml-0" />}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {!ann.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                    {ann.isRead && <span className="h-2 w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {ann.isPinned && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-0.5"><Pin className="h-2.5 w-2.5" />Pinned</span>}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[ann.priority]}`}>{ann.priority}</span>
                          </div>
                          <h3 className={`font-semibold text-sm ${ann.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{ann.title}</h3>
                        </div>
                        {!ann.isRead && <Button size="sm" variant="ghost" className="h-6 text-xs shrink-0" onClick={() => markRead(ann.announcementId)}>Read</Button>}
                      </div>
                      <p className={`text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>{ann.content}</p>
                      {isLong && <button type="button" onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(ann.announcementId) ? s.delete(ann.announcementId) : s.add(ann.announcementId); return s; })} className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">{isExpanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}</button>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">{ann.authorName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MESSAGES PAGE ────────────────────────────────────────────────────────────

export function MessagesPage() {
  const { threads, sendMessage, markRead, createThread } = useMessages();
  const [activeId, setActiveId]   = useState<string | null>(threads[0]?.threadId ?? null);
  const [message,  setMessage]    = useState('');
  const [newOpen,  setNewOpen]    = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMsg,   setNewMsg]     = useState('');

  const active = threads.find(t => t.threadId === activeId);

  const unreadThreads = threads.filter(t => t.messages.some(m => !m.readBy.includes(CURRENT_USER.userId) && m.senderId !== CURRENT_USER.userId));

  function send() {
    if (!message.trim() || !activeId) return;
    sendMessage(activeId, message.trim());
    setMessage('');
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader icon={MessageSquare} title="Messages" color="bg-emerald-600" subtitle="Secure board communications" />
        <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setNewOpen(true)}>
          <Plus className="h-3.5 w-3.5" />New Thread
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Thread list */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{threads.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet</div> : threads.map(t => {
              const hasUnread = t.messages.some(m => !m.readBy.includes(CURRENT_USER.userId) && m.senderId !== CURRENT_USER.userId);
              return (
                <button key={t.threadId} type="button" onClick={() => { setActiveId(t.threadId); markRead(t.threadId); }}
                  className={`w-full text-left p-4 transition-colors border-b border-border/30 last:border-0 ${activeId === t.threadId ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'hover:bg-muted/40'}`}>
                  <div className="flex items-start gap-2">
                    {hasUnread && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                    {!hasUnread && <span className="h-2 w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium line-clamp-1 ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>{t.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.lastMessage}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message area */}
        <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Select a conversation</p></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border/40">
                <p className="font-semibold text-sm">{active.subject}</p>
                <p className="text-xs text-muted-foreground">{active.participantNames.join(', ')}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {active.messages.filter(m => !m.isDeleted).map(msg => {
                  const isMine = msg.senderId === CURRENT_USER.userId;
                  return (
                    <div key={msg.messageId} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMine ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}>{msg.senderName[0]}</div>
                      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMine && <p className="text-xs text-muted-foreground mb-1">{msg.senderName}</p>}
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>{msg.content}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message…" className="flex-1 h-9 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={send} disabled={!message.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New thread dialog */}
      <Dialog open={newOpen} onOpenChange={o => { if (!o) setNewOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Conversation</DialogTitle><DialogDescription>Start a new message thread</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label><Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Thread subject…" className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</Label><Textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Your message…" rows={4} className="text-sm resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
              if (!newSubject.trim() || !newMsg.trim()) { toast.error('Subject and message required'); return; }
              const threadId = createThread(newSubject.trim(), [], [], newMsg.trim());
              setActiveId(threadId); setNewOpen(false); setNewSubject(''); setNewMsg(''); toast.success('Thread created');
            }}>Create Thread</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── NOTIFICATIONS PAGE ───────────────────────────────────────────────────────

export function NotificationsPage() {
  const { notifications, markRead, markAllRead, deleteNotification } = useNotifications();

  const TYPE_ICONS: Record<string, React.ElementType> = { MEETING: CalendarDays, TASK: CheckSquare, DOCUMENT: FileText, RESOLUTION: Vote, POLL: BarChart3, ANNOUNCEMENT: Megaphone, MESSAGE: MessageSquare };
  const TYPE_COLORS: Record<string, string> = { MEETING: 'bg-indigo-100 text-indigo-700', TASK: 'bg-emerald-100 text-emerald-700', DOCUMENT: 'bg-sky-100 text-sky-700', RESOLUTION: 'bg-amber-100 text-amber-700', POLL: 'bg-violet-100 text-violet-700', ANNOUNCEMENT: 'bg-rose-100 text-rose-700', MESSAGE: 'bg-teal-100 text-teal-700' };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="container mx-auto max-w-3xl px-4 md:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader icon={Bell} title="Notifications" color="bg-rose-500" subtitle="Alerts and updates" />
        {unread > 0 && <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 mt-1 gap-1.5" onClick={() => { markAllRead(); toast.success('All notifications cleared'); }}><Check className="h-3.5 w-3.5" />Clear all</Button>}
      </div>

      {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" sub="You're all caught up!" /> : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const color = TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-600';
            return (
              <div key={n.notificationId} className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${!n.isRead ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' : 'border-border/60 bg-card hover:bg-muted/20'}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.isRead && <button type="button" onClick={() => markRead(n.notificationId)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"><Check className="h-4 w-4" /></button>}
                  <button type="button" onClick={() => deleteNotification(n.notificationId)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── COMPLIANCE PAGE ──────────────────────────────────────────────────────────

export function CompliancePage() {
  const { items, acknowledge } = useCompliance();

  const pending     = items.filter(c => !c.isAcknowledged);
  const acknowledged = items.filter(c => c.isAcknowledged);

  const TYPE_COLORS: Record<string, string> = { POLICY: 'bg-violet-100 text-violet-700', DISCLOSURE: 'bg-amber-100 text-amber-700', REGULATORY: 'bg-red-100 text-red-700', ACKNOWLEDGMENT: 'bg-indigo-100 text-indigo-700' };

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 py-8">
      <PageHeader icon={Shield} title="Compliance & Governance" color="bg-slate-700" subtitle="Policy acknowledgments and regulatory requirements" />

      {pending.length === 0 && acknowledged.length === 0 ? <EmptyState icon={Shield} title="No compliance items" /> : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-amber-500" />Pending · {pending.length}</h2>
              {pending.map(c => (
                <div key={c.complianceId} className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>{c.type}</span></div>
                      <h3 className="font-semibold text-foreground">{c.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                      {c.dueDate && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1"><Clock className="h-3 w-3" />Due {formatDistanceToNow(new Date(c.dueDate), { addSuffix: true })}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {c.documentUrl && <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild><a href={c.documentUrl} target="_blank" rel="noopener noreferrer"><FileText className="h-3.5 w-3.5" />View</a></Button>}
                      <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { acknowledge(c.complianceId); toast.success('Acknowledged!'); }}>
                        <Check className="h-3.5 w-3.5" />Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {acknowledged.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Completed · {acknowledged.length}</h2>
              {acknowledged.map(c => (
                <div key={c.complianceId} className="rounded-2xl border border-border/60 bg-card p-4 opacity-70">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground">{c.title}</p>
                      {c.acknowledgedAt && <p className="text-xs text-muted-foreground mt-0.5">Acknowledged {format(new Date(c.acknowledgedAt), 'MMM d, yyyy')}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>{c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const analytics = useAnalytics();

  function RingGauge({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
    const r = 36; const circ = 2 * Math.PI * r; const dash = (value / 100) * circ;
    return (
      <div className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="relative">
          <svg width="90" height="90" className="-rotate-90">
            <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className={color} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-black">{value}%</span>
        </div>
        <p className="text-sm font-semibold text-center">{label}</p>
        {sub && <p className="text-xs text-muted-foreground text-center">{sub}</p>}
      </div>
    );
  }

  const maxBar = Math.max(...analytics.monthlyTrend.map(m => Math.max(m.meetings, m.tasks, m.votes)), 1);

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={TrendingUp} title="Analytics & Reports" color="bg-rose-500" subtitle="Board performance insights" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <RingGauge value={analytics.attendanceRate}         label="Meeting Attendance"  color="text-indigo-500"  sub={`${analytics.meetingsThisQuarter} meetings this quarter`} />
        <RingGauge value={analytics.taskCompletionRate}     label="Task Completion"     color="text-emerald-500" />
        <RingGauge value={analytics.votingParticipationRate}label="Voting Participation"color="text-amber-500"   sub={`${analytics.resolutionsPassed} resolutions passed`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Meetings this quarter', value: analytics.meetingsThisQuarter, icon: CalendarDays, color: 'text-indigo-600' },
          { label: 'Documents reviewed',    value: analytics.documentsReviewed,   icon: FileText,     color: 'text-sky-600' },
          { label: 'Resolutions passed',    value: analytics.resolutionsPassed,   icon: Award,        color: 'text-emerald-600' },
          { label: 'Avg meeting duration',  value: `${analytics.avgMeetingDuration}min`, icon: Clock, color: 'text-violet-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-5">6-Month Activity Trend</h3>
        <div className="flex items-end gap-3 h-36">
          {analytics.monthlyTrend.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '100px' }}>
                {[{ val: m.meetings, color: 'bg-indigo-500' }, { val: m.tasks, color: 'bg-emerald-500' }, { val: m.votes, color: 'bg-amber-500' }].map((b, j) => (
                  <div key={j} className={`flex-1 rounded-sm transition-all ${b.color}`} style={{ height: `${Math.round((b.val / maxBar) * 100)}%` }} title={`${b.val}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{m.month}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {[{ label: 'Meetings', color: 'bg-indigo-500' }, { label: 'Tasks', color: 'bg-emerald-500' }, { label: 'Votes', color: 'bg-amber-500' }].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-sm ${l.color}`} />{l.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ARCHIVES PAGE ────────────────────────────────────────────────────────────

export function ArchivesPage() {
  const { meetings }   = useMeetings();
  const { documents }  = useDocuments();
  const { resolutions }= useResolutions();
  const [search, setSearch] = useState('');
  const [type,   setType]   = useState('all');

  const pastMeetings    = meetings.filter(m => m.status === 'COMPLETED');
  const archivedDocs    = documents.filter(d => d.category === 'MINUTES' || d.category === 'REPORT');
  const closedRes       = resolutions.filter(r => r.status === 'PASSED' || r.status === 'REJECTED' || r.status === 'DEFERRED');

  const all = [
    ...pastMeetings.map(m => ({ id: m.meetingId, type: 'Meeting' as const, title: m.title, date: m.scheduledAt, summary: m.postMeetingSummary ?? m.description })),
    ...archivedDocs.map(d => ({ id: d.documentId, type: 'Document' as const, title: d.title, date: d.createdAt, summary: d.description })),
    ...closedRes.map(r => ({ id: r.resolutionId, type: 'Resolution' as const, title: r.title, date: r.updatedAt, summary: r.outcome ?? r.description })),
  ].filter(item =>
    (!search || item.title.toLowerCase().includes(search.toLowerCase())) &&
    (type === 'all' || item.type === type)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const TYPE_COLORS: Record<string, string> = { Meeting: 'bg-indigo-100 text-indigo-700', Document: 'bg-sky-100 text-sky-700', Resolution: 'bg-amber-100 text-amber-700' };
  const TYPE_ICONS: Record<string, React.ElementType> = { Meeting: CalendarDays, Document: FileText, Resolution: Vote };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={Archive} title="Archives" color="bg-orange-600" subtitle="Historical board records" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search archives…" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All records</SelectItem><SelectItem value="Meeting">Meetings</SelectItem><SelectItem value="Document">Documents</SelectItem><SelectItem value="Resolution">Resolutions</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: 'Past Meetings', value: pastMeetings.length, color: 'text-indigo-600' }, { label: 'Archived Docs', value: archivedDocs.length, color: 'text-sky-600' }, { label: 'Closed Resolutions', value: closedRes.length, color: 'text-amber-600' }].map(s => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {all.length === 0 ? <EmptyState icon={Archive} title="No archived records" /> : (
        <div className="space-y-2">
          {all.map(item => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:shadow-sm transition-all">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[item.type]}`}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>{item.type}</span></div>
                  <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                  {item.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const [form, setForm] = useState({ ...profile });
  const [tab,  setTab]  = useState<'profile'|'notifications'|'security'>('profile');

  function save() {
    updateProfile(form);
    toast.success('Profile updated');
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 md:px-6 py-8">
      <PageHeader icon={Users} title="Profile & Settings" color="bg-indigo-600" subtitle="Personal information and preferences" />

      <div className="flex items-center gap-1 border-b border-border/60 mb-6">
        {(['profile','notifications','security'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-border/60 bg-card">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-500/30">{form.firstName[0]}{form.lastName[0]}</div>
            <div>
              <p className="text-lg font-bold">{form.firstName} {form.lastName}</p>
              <p className="text-sm text-muted-foreground">{form.title} · {form.organisation}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since {format(new Date(form.joinedAt), 'MMM yyyy')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['First Name', 'firstName'], ['Last Name', 'lastName'], ['Email', 'email'], ['Phone', 'phone'], ['Title', 'title']].map(([label, key]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
                <Input value={(form as any)[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="h-9 text-sm" disabled={key === 'email'} />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio</Label>
              <Textarea value={form.bio ?? ''} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="text-sm resize-none" />
            </div>
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save}>Save Changes</Button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose which notifications you want to receive.</p>
          {Object.entries(form.notificationPreferences).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card">
              <div>
                <p className="text-sm font-medium capitalize">{key}</p>
                <p className="text-xs text-muted-foreground">Receive notifications for {key}</p>
              </div>
              <Switch checked={val} onCheckedChange={v => setForm(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, [key]: v } }))} />
            </div>
          ))}
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save}>Save Preferences</Button>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card">
            <div>
              <p className="text-sm font-semibold">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">{form.twoFactorEnabled ? 'Enabled — your account is more secure.' : 'Disabled — enable for extra security.'}</p>
            </div>
            <Switch checked={form.twoFactorEnabled} onCheckedChange={v => { setForm(p => ({ ...p, twoFactorEnabled: v })); updateProfile({ twoFactorEnabled: v }); toast.success(v ? '2FA enabled' : '2FA disabled'); }} />
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
            <p className="text-sm font-semibold">Change Password</p>
            <Input type="password" placeholder="Current password" className="h-9 text-sm" />
            <Input type="password" placeholder="New password" className="h-9 text-sm" />
            <Input type="password" placeholder="Confirm new password" className="h-9 text-sm" />
            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => toast.success('Password would be updated (backend needed)')}>Update Password</Button>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Session Information</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Current session active. Password and 2FA changes require backend integration to persist securely.</p>
          </div>
        </div>
      )}
    </div>
  );
}