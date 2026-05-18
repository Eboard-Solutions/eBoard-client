'use client';

// src/pages/Dashboard.tsx
import { useState, useEffect, useRef, useMemo} from 'react';
import { useLocation } from 'wouter';
import { useMyMeetings, useMeetings } from '@/hooks/api/useMeetings';
import { useAnnouncements } from '@/hooks/api/useAnnouncements';
import { useDocuments } from '@/hooks/api/useDocuments';
import { useTasks } from '@/hooks/api/useTasks';
import { usePolls } from '@/hooks/api/usePolls';
import { useAnalytics, useFinanceOverview } from '@/hooks/api/useOverview';
import { usePendingOrganisations, useOrganisations } from '@/hooks/api/useOrganisations';
import { authService } from '@/api/services';
import { UpcomingMeetingsWidget }  from '@/components/dashboard/UpcomingMeetingsWidget';
import { OpenActionsWidget }       from '@/components/dashboard/OpenActionsWidget';
import { SmartRemindersWidget }    from '@/components/dashboard/SmartRemindersWidget';
import { BudgetSummaryWidget }     from '@/components/dashboard/BudgetSummaryWidget';
import { VotingOverviewWidget }    from '@/components/dashboard/VotingOverviewWidget';
import { AttendanceWidget }        from '@/components/dashboard/AttendanceWidget';
import { RecentDocumentsWidget }   from '@/components/dashboard/RecentDocumentsWidget';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import type { Poll } from '@/types';
import {
  Building2, CheckCircle, Clock, AlertTriangle,
  TrendingUp, BarChart3, Vote, ListTodo, Bell,
  Megaphone, Circle, Calendar, ArrowRight,
  FileText, Users, Pin, ChevronRight,
  Activity, Zap, Shield, RefreshCw,
  CheckCheck, Plus, ExternalLink,
  Search, Sparkles, TrendingDown,ArrowUp,
  Smartphone,
} from 'lucide-react';

const ANDROID_APK_URL = 'https://storage.pointitpos.com/app/downloads/Eboard.apk';

// ─── Global styles (injected once) ───────────────────────────────────────────
const STYLES = `
@keyframes db-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes db-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes db-pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes db-count-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes db-slide-down {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes db-float-a {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(14px,-12px) scale(1.06); }
}
@keyframes db-float-b {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(-12px,8px) scale(1.04); }
}
@keyframes db-bar-fill {
  from { width: 0%; }
  to   { width: var(--bar-w); }
}
@keyframes db-pulse-dot {
  0%,100% { opacity: 1;   transform: scale(1); }
  50%     { opacity: 0.5; transform: scale(1.15); }
}
@keyframes db-fab-in {
  from { opacity: 0; transform: scale(0.6) translateY(20px); }
  to   { opacity: 1; transform: scale(1)   translateY(0);    }
}
@keyframes db-grad-pan {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.db-fade-up    { animation: db-fade-up  0.4s cubic-bezier(0.22,1,0.36,1) both; }
.db-count-in   { animation: db-count-in 0.4s cubic-bezier(0.34,1.5,0.64,1) both; }
.db-slide-down { animation: db-slide-down 0.22s cubic-bezier(0.22,1,0.36,1) both; }
.db-fab-in     { animation: db-fab-in 0.35s cubic-bezier(0.34,1.6,0.64,1) both; }
.db-pulse-dot  { animation: db-pulse-dot 2s ease-in-out infinite; }

.db-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 0.6);
  border-radius: 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  box-shadow: 0 1px 2px hsl(220 40% 20% / 0.04), 0 0 0 1px hsl(220 30% 90% / 0);
}
.db-card:hover {
  box-shadow: 0 10px 32px hsl(var(--foreground) / 0.06), 0 1px 2px hsl(var(--foreground) / 0.04);
  transform: translateY(-1px);
  border-color: hsl(var(--border) / 0.9);
}
.db-card-flat {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 0.55);
  border-radius: 16px;
}

/* Glass surface */
.db-glass {
  background: hsl(var(--card) / 0.72);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: 16px;
}

/* ─── Light-mode polish ─────────────────────────────────────────────────── */
:root:not(.dark) .db-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  border-color: hsl(220 22% 90%);
  box-shadow:
    0 1px 0 hsl(220 30% 100% / 0.7) inset,
    0 1px 2px hsl(220 40% 30% / 0.04),
    0 1px 3px hsl(220 40% 30% / 0.03);
}
:root:not(.dark) .db-card:hover {
  border-color: hsl(220 22% 84%);
  box-shadow:
    0 1px 0 hsl(220 30% 100% / 0.8) inset,
    0 14px 36px hsl(232 60% 30% / 0.10),
    0 4px 10px hsl(232 60% 30% / 0.05);
}
:root:not(.dark) .db-card-flat {
  background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
  border-color: hsl(220 22% 90%);
  box-shadow: 0 1px 2px hsl(220 40% 30% / 0.04);
}
:root:not(.dark) .db-glass {
  background: linear-gradient(135deg,
    hsl(0 0% 100% / 0.85) 0%,
    hsl(232 60% 98% / 0.75) 100%);
  border-color: hsl(220 30% 92%);
  box-shadow:
    0 1px 0 hsl(0 0% 100% / 0.9) inset,
    0 8px 24px hsl(232 60% 30% / 0.06);
}
:root:not(.dark) .db-progress-bar {
  background: hsl(220 25% 94%);
}
:root:not(.dark) .db-skeleton {
  background: linear-gradient(90deg,
    hsl(220 25% 94%) 25%,
    hsl(220 25% 97%) 50%,
    hsl(220 25% 94%) 75%);
  background-size: 200% 100%;
}

/* Ambient gradient backdrop wash for light mode (subtle) */
:root:not(.dark) .db-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(900px 500px at 12% -10%, hsl(239 90% 70% / 0.10), transparent 60%),
    radial-gradient(700px 420px at 95% 0%,  hsl(269 85% 70% / 0.09), transparent 60%),
    radial-gradient(800px 500px at 50% 100%, hsl(196 85% 65% / 0.07), transparent 60%);
}

/* Gradient ring for premium cards */
.db-ring-grad {
  position: relative;
}
.db-ring-grad::before {
  content: '';
  position: absolute; inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(135deg,
    hsl(239 84% 67% / 0.4),
    hsl(269 84% 65% / 0.25),
    transparent 60%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}

/* Progress bar */
.db-progress-bar {
  height: 6px;
  border-radius: 99px;
  background: hsl(var(--muted));
  overflow: hidden;
}
.db-progress-fill {
  height: 100%;
  border-radius: 99px;
  animation: db-bar-fill 0.7s cubic-bezier(0.22,1,0.36,1) both;
  animation-delay: 0.15s;
}

/* Skeleton shimmer */
.db-skeleton {
  background: linear-gradient(90deg, hsl(var(--muted)/0.55) 25%, hsl(var(--muted)/0.95) 50%, hsl(var(--muted)/0.55) 75%);
  background-size: 200% 100%;
  animation: db-shimmer 1.2s ease-in-out infinite;
  border-radius: 10px;
}

/* Stat card glow variants */
.db-stat-indigo  { border-color: hsl(239 84% 67% / 0.22) !important; }
.db-stat-indigo:hover  { box-shadow: 0 10px 32px hsl(239 84% 67% / 0.10); }
.db-stat-amber   { border-color: hsl(38 92% 50% / 0.28) !important; }
.db-stat-amber:hover   { box-shadow: 0 10px 32px hsl(38 92% 50% / 0.10); }
.db-stat-emerald { border-color: hsl(142 76% 36% / 0.28) !important; }
.db-stat-emerald:hover { box-shadow: 0 10px 32px hsl(142 76% 36% / 0.10); }
.db-stat-rose    { border-color: hsl(350 89% 60% / 0.28) !important; }
.db-stat-rose:hover    { box-shadow: 0 10px 32px hsl(350 89% 60% / 0.10); }
.db-stat-violet  { border-color: hsl(269 84% 65% / 0.28) !important; }
.db-stat-violet:hover  { box-shadow: 0 10px 32px hsl(269 84% 65% / 0.10); }

/* Light-mode tinted stat cards — subtle color wash + stronger color glow */
:root:not(.dark) .db-stat-indigo  { background: linear-gradient(180deg, #ffffff 0%, hsl(239 100% 99%) 100%) !important; border-color: hsl(239 70% 88%) !important; }
:root:not(.dark) .db-stat-indigo:hover  { box-shadow: 0 14px 36px hsl(239 84% 60% / 0.18), 0 2px 6px hsl(239 84% 60% / 0.08); border-color: hsl(239 75% 78%) !important; }
:root:not(.dark) .db-stat-amber   { background: linear-gradient(180deg, #ffffff 0%, hsl(38 100% 98%) 100%) !important; border-color: hsl(38 80% 82%) !important; }
:root:not(.dark) .db-stat-amber:hover   { box-shadow: 0 14px 36px hsl(38 92% 50% / 0.18), 0 2px 6px hsl(38 92% 50% / 0.08); border-color: hsl(38 80% 70%) !important; }
:root:not(.dark) .db-stat-emerald { background: linear-gradient(180deg, #ffffff 0%, hsl(142 60% 98%) 100%) !important; border-color: hsl(142 50% 82%) !important; }
:root:not(.dark) .db-stat-emerald:hover { box-shadow: 0 14px 36px hsl(142 76% 40% / 0.18), 0 2px 6px hsl(142 76% 40% / 0.08); border-color: hsl(142 55% 70%) !important; }
:root:not(.dark) .db-stat-rose    { background: linear-gradient(180deg, #ffffff 0%, hsl(350 100% 99%) 100%) !important; border-color: hsl(350 80% 88%) !important; }
:root:not(.dark) .db-stat-rose:hover    { box-shadow: 0 14px 36px hsl(350 89% 60% / 0.18), 0 2px 6px hsl(350 89% 60% / 0.08); border-color: hsl(350 85% 78%) !important; }
:root:not(.dark) .db-stat-violet  { background: linear-gradient(180deg, #ffffff 0%, hsl(269 100% 99%) 100%) !important; border-color: hsl(269 70% 88%) !important; }
:root:not(.dark) .db-stat-violet:hover  { box-shadow: 0 14px 36px hsl(269 84% 60% / 0.18), 0 2px 6px hsl(269 84% 60% / 0.08); border-color: hsl(269 75% 78%) !important; }

/* AI insights gradient border */
.db-insight {
  position: relative;
  border-radius: 16px;
  background: hsl(var(--card));
  overflow: hidden;
}
.db-insight::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(120deg,
    hsl(269 84% 65% / 0.55),
    hsl(239 84% 67% / 0.4),
    hsl(196 80% 55% / 0.4),
    hsl(269 84% 65% / 0.55));
  background-size: 200% 100%;
  animation: db-grad-pan 8s linear infinite;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}

/* Sparkline-like micro bar */
.db-spark {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
}
.db-spark > span {
  flex: 1;
  border-radius: 2px;
  opacity: 0.85;
  transition: opacity 0.2s;
}
.db-card:hover .db-spark > span { opacity: 1; }

/* FAB */
.db-fab {
  position: fixed; right: 24px; bottom: 24px; z-index: 40;
  width: 56px; height: 56px; border-radius: 18px;
  background: linear-gradient(135deg, hsl(239 84% 60%), hsl(269 84% 60%));
  color: white;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 32px hsl(239 84% 60% / 0.45), 0 2px 6px hsl(239 84% 60% / 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}
.db-fab:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 18px 40px hsl(239 84% 60% / 0.5); }
.db-fab:active { transform: scale(0.96); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .db-fade-up, .db-count-in, .db-slide-down, .db-fab-in,
  .db-pulse-dot, .db-progress-fill, .db-skeleton { animation: none !important; }
}
`;

function useStyleInject() {
  useEffect(() => {
    const id = 'dashboard-v3-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = STYLES;
      document.head.appendChild(s);
    }
  }, []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function unwrapArray<T>(res: unknown): T[] {
  if (!res) return [];
  const r = res as Record<string, unknown>;
  const d = r?.data ?? r;
  if (Array.isArray(d)) return d as T[];
  const dd = d as Record<string, unknown>;
  if (Array.isArray(dd?.data))  return dd.data  as T[];
  if (Array.isArray(dd?.items)) return dd.items as T[];
  return [];
}

// `useMyMeetings` returns MeetingAttendees rows with the joined meeting nested
// under `m.meeting`. `useMeetings` returns plain Meeting DTOs at the top level.
// This helper unwraps either shape so the rest of the dashboard can ignore it.
function meetingOf(m: Record<string, unknown>): Record<string, unknown> {
  const nested = m.meeting as Record<string, unknown> | undefined;
  return nested && typeof nested === 'object' ? nested : m;
}

function isFutureMeeting(m: Record<string, unknown>): boolean {
  const src = meetingOf(m);
  const raw = (src.scheduledDate ?? src.date) as string | Date | undefined;
  if (!raw) return false;
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return false;
  // Include "today" as upcoming so meetings later today still show.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

function transformMeeting(m: Record<string, unknown>) {
  const src = meetingOf(m);
  const rawDate  = (src.scheduledDate ?? src.date) as string | Date | undefined;
  const dateStr  = rawDate ? new Date(rawDate as string).toISOString() : '';
  const startTime = (src.startTime as string) ?? '';
  let startAt = dateStr;
  if (dateStr && startTime) {
    const d = dateStr.split('T')[0];
    const t = typeof startTime === 'string' && startTime.includes('T')
      ? startTime.split('T')[1]
      : startTime;
    startAt = `${d}T${t}`;
  }
  return {
    id:          (src.meetingId ?? src.id ?? m.attendeeId ?? '') as string,
    title:       (src.title ?? 'Untitled') as string,
    startAt,
    endAt:       (src.endTime ?? '') as string,
    timezone:    'local',
    location:    ((src.location ?? src.onlineMeetingLink) ?? '') as string,
    isRecurring: (src.meetingFrequency as string) !== 'once'
              && (src.meetingFrequency as string) !== 'ONCE',
    status:      ((src.meetingStatus ?? src.status ?? 'upcoming')) as 'upcoming' | 'completed' | 'cancelled',
    agenda: [],
    attendees: (src.attendees ?? []) as unknown[],
    createdBy: ((src.creator as Record<string, unknown>)?.userId ?? '') as string,
    createdAt: (src.createdAt ?? '') as string,
  };
}

function taskDueMs(t: Record<string, unknown>): string | undefined {
  const v = t.dueDate ?? t.deadline;
  if (!v) return undefined;
  if (typeof v === 'number') return new Date(v).toISOString();
  return v as string;
}

function fmtRelative(ts?: number | string): string {
  if (!ts) return '';
  const d   = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Deterministic pseudo-sparkline so it looks data-shaped without re-render churn
function sparklineFor(seed: number, n = 12): number[] {
  const out: number[] = [];
  let v = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) {
    v = (v * 9301 + 49297) % 233280;
    out.push(0.35 + (v / 233280) * 0.65);
  }
  return out;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`db-skeleton ${className}`} style={style} />;
}

function WidgetSkel({ rows = 3, h = 44 }: { rows?: number; h?: number }) {
  return (
    <div className="space-y-2.5 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} style={{ height: h, opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'bg-indigo-500' }: { pct: number; color?: string }) {
  return (
    <div className="db-progress-bar">
      <div
        className={`db-progress-fill ${color}`}
        style={{ '--bar-w': `${Math.min(100, Math.max(0, pct))}%` } as React.CSSProperties}
      />
    </div>
  );
}

// ─── Sparkline mini-chart ─────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  return (
    <div className="db-spark" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={color}
          style={{ height: `${Math.round(v * 100)}%`, opacity: 0.25 + (i / values.length) * 0.75 }}
        />
      ))}
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="shrink-0 rounded-2xl border border-border/50 bg-muted/30 px-5 py-4 text-center min-w-[132px] backdrop-blur-sm">
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none text-foreground">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Live presence indicator (simulated) ─────────────────────────────────────
function LivePresence({ count = 3 }: { count?: number }) {
  const palette = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-emerald-500 db-pulse-dot" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <div className="flex -space-x-1.5">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-2 border-card ${palette[i % palette.length]} text-[9px] font-bold text-white flex items-center justify-center`}
          >
            {String.fromCharCode(65 + i)}
          </span>
        ))}
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{count} live</span>
    </div>
  );
}

// ─── Command palette (⌘K) ────────────────────────────────────────────────────
interface CommandItem { label: string; icon: LucideIcon; to: string; group: string; }

function CommandPalette({ items, open, onClose }: {
  items: CommandItem[]; open: boolean; onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { 
      setTimeout(() => { 
        setQ(''); 
        setIdx(0); 
        inputRef.current?.focus(); 
      }, 0); 
    }
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return items;
    return items.filter(i => i.label.toLowerCase().includes(ql) || i.group.toLowerCase().includes(ql));
  }, [items, q]);

  if (!open) return null;

  const go = (item: CommandItem) => { navigate(item.to); onClose(); };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'hsl(var(--background) / 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="db-slide-down w-full max-w-xl rounded-2xl border border-border/70 bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && filtered[idx]) go(filtered[idx]);
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0); }}
            placeholder="Search actions, pages, recent items…"
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/70"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No results for "{q}"</div>
          ) : (
            filtered.map((it, i) => (
              <button
                key={it.label}
                onClick={() => go(it)}
                onMouseEnter={() => setIdx(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === idx ? 'bg-muted/60' : ''}`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/80">
                  <it.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{it.group}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="font-mono border border-border/60 rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="font-mono border border-border/60 rounded px-1">↵</kbd> select</span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}

// ─── Floating quick-create FAB ────────────────────────────────────────────────
function QuickCreateFab({ items }: { items: { label: string; icon: LucideIcon; to: string; color: string }[] }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref}>
      {open && (
        <div className="fixed right-6 bottom-[96px] z-40 db-fab-in flex flex-col gap-2 items-end">
          {items.map((it, i) => (
            <button
              key={it.label}
              onClick={() => { setOpen(false); navigate(it.to); }}
              className={`db-fab-in flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-2xl border shadow-lg text-sm font-medium ${it.color}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span>{it.label}</span>
              <it.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
      <button
        aria-label="Quick create"
        onClick={() => setOpen(o => !o)}
        className="db-fab"
        style={{ transform: open ? 'rotate(45deg)' : undefined }}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

// ─── Quick actions bar ────────────────────────────────────────────────────────
function QuickActions({ role, onOpenPalette }: { role: 'super' | 'admin' | 'user'; onOpenPalette?: () => void }) {
  const [, navigate] = useLocation();

  const actions: { label: string; icon: LucideIcon; to: string; color: string }[] = [
    ...(role !== 'user' ? [
      { label: 'New Meeting',       icon: Calendar,  to: '/meetings/new',     color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' },
      { label: 'Create Task',       icon: ListTodo,  to: '/tasks/new',        color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800' },
      { label: 'New Announcement',  icon: Megaphone, to: '/announcements',    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' },
      { label: 'Upload Document',   icon: FileText,  to: '/documents',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    ] : [
      { label: 'My Meetings',       icon: Calendar,  to: '/meetings',         color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' },
      { label: 'My Tasks',          icon: ListTodo,  to: '/tasks',            color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800' },
      { label: 'Documents',         icon: FileText,  to: '/documents',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
      { label: 'Polls & Voting',    icon: Vote,      to: '/voting',           color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
    ]),
  ];

  return (
    <div className="db-fade-up db-glass p-4" style={{ animationDelay: '40ms' }}>
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Zap className="h-3 w-3" />Quick Actions
        </p>
        {onOpenPalette && (
          <button
            onClick={onOpenPalette}
            className="hidden md:flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 hover:bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <span className="ml-2 flex items-center gap-0.5">
              <kbd className="font-mono text-[10px] border border-border/60 rounded px-1 py-0.5">⌘</kbd>
              <kbd className="font-mono text-[10px] border border-border/60 rounded px-1 py-0.5">K</kbd>
            </span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${a.color}`}
          >
            <a.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Welcome banner ───────────────────────────────────────────────────────────
function WelcomeBanner({ userName, subtitle, role }: {
  userName: string;
  subtitle: string;
  role: 'super' | 'admin' | 'user';
}) {
  const greetings = ['Good to see you', 'Welcome back', 'Ready to lead', 'Let\'s get started'];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 6000);
    return () => clearInterval(t);
  }, []);
  const greeting  = greetings[tick % greetings.length];

  const orbA: Record<string, string> = {
    super: 'rgba(139,92,246,0.32)',
    admin: 'rgba(99,102,241,0.28)',
    user:  'rgba(16,185,129,0.26)',
  };
  const orbB: Record<string, string> = {
    super: 'rgba(217,70,239,0.20)',
    admin: 'rgba(6,182,212,0.20)',
    user:  'rgba(6,182,212,0.20)',
  };

  const hour  = new Date().getHours();
  const emoji = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';
  const tod   = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <div
      className="db-fade-up db-ring-grad relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-7"
    >
      {/* Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: orbA[role], animation: 'db-float-a 12s ease-in-out infinite' }} />
        <div className="absolute -bottom-16 -left-12 h-52 w-52 rounded-full blur-3xl"
          style={{ background: orbB[role], animation: 'db-float-b 16s ease-in-out infinite' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle,currentColor 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              key={tick}
              className="db-count-in text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground"
            >
              {greeting} · this {tod}
            </span>
            <span className="h-px w-10 bg-border/60 shrink-0" />
            <LivePresence count={4} />
          </div>

          <h1 className="text-[2rem] sm:text-[2.4rem] font-black tracking-tight leading-tight"
            style={{
              background: 'linear-gradient(128deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)/0.55) 40%, hsl(var(--primary)) 60%, hsl(var(--foreground)) 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'db-grad-pan 8s linear infinite',
            }}
          >
            {userName?.split(' ')[0] ?? 'Welcome'}{' '}
            <span style={{ WebkitTextFillColor: 'initial' }}>{emoji}</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{subtitle}</p>
        </div>

        <LiveClock />
      </div>
    </div>
  );
}

// ─── Announcement bell ────────────────────────────────────────────────────────
interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  publishedAt?: number;
}

function AnnouncementBell({ announcements }: { announcements: Announcement[] }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const unread = announcements.filter(a => !read.has(a.id)).length;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/70 hover:border-border hover:bg-muted/40 transition-all duration-200 shadow-sm hover:shadow"
        aria-label="Announcements"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-600 text-white font-bold px-1"
              style={{ fontSize: 10 }}>
              {unread > 9 ? '9+' : unread}
            </span>
            <span className="absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full bg-indigo-500"
              style={{ opacity: 0.35, animation: 'db-pulse-ring 1.7s ease-out infinite' }} />
          </>
        )}
      </button>

      {open && (
        <div className="db-slide-down absolute right-0 top-12 z-50 w-80 sm:w-[380px] rounded-2xl border border-border/70 bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold">Announcements</span>
              {unread > 0 && (
                <Badge className="h-5 text-[10px] px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 border">
                  {unread} new
                </Badge>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => setRead(new Set(announcements.map(a => a.id)))}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <CheckCheck className="h-3 w-3" />Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-muted-foreground">
                <Bell className="h-9 w-9 opacity-20" />
                <p className="text-sm font-medium">No announcements yet</p>
              </div>
            ) : (
              announcements.map(a => {
                const isUnread = !read.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => { setRead(p => new Set([...p, a.id])); }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors ${isUnread ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-2 h-1.5 w-1.5 rounded-full shrink-0 ${isUnread ? 'bg-indigo-500' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{a.title}</span>
                          {a.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                              <Pin className="h-2.5 w-2.5" />Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1.5">{fmtRelative(a.publishedAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
            <button
              onClick={() => { setOpen(false); navigate('/announcements'); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold transition-colors"
            >
              View all announcements
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
type StatVariant = 'indigo' | 'amber' | 'emerald' | 'rose' | 'violet';

interface StatCardProps {
  title:    string;
  value:    string | number;
  icon:     LucideIcon;
  sub?:     string;
  variant?: StatVariant;
  delay?:   number;
  onClick?: () => void;
  progress?: number;
  trend?:   number; // +12 / -4
  loading?: boolean;
  spark?:   number;  // seed
}

const STAT_VARIANTS: Record<StatVariant, { icon: string; progress: string; spark: string }> = {
  indigo:  { icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',     progress: 'bg-indigo-500',  spark: 'bg-indigo-500' },
  amber:   { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',         progress: 'bg-amber-500',   spark: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400', progress: 'bg-emerald-500', spark: 'bg-emerald-500' },
  rose:    { icon: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',             progress: 'bg-rose-500',    spark: 'bg-rose-500' },
  violet:  { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',     progress: 'bg-violet-500',  spark: 'bg-violet-500' },
};

function StatCard({ title, value, icon: Icon, sub, variant = 'indigo', delay = 0, onClick, progress, trend, loading, spark }: StatCardProps) {
  const v = STAT_VARIANTS[variant];
  if (loading) {
    return (
      <div className="db-fade-up db-card p-5" style={{ animationDelay: `${delay}ms`, minHeight: 148 }}>
        <Skel style={{ height: 44, width: 44, borderRadius: 12, marginBottom: 12 }} />
        <Skel style={{ height: 10, width: '40%', marginBottom: 8 }} />
        <Skel style={{ height: 28, width: '55%', marginBottom: 8 }} />
        <Skel style={{ height: 8, width: '70%' }} />
      </div>
    );
  }
  const trendUp   = (trend ?? 0) > 0;
  const sparkVals = sparklineFor(spark ?? title.length, 14);

  return (
    <div
      className={`db-fade-up db-card p-5 db-stat-${variant} group ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.icon} transition-transform duration-200 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          {trend !== undefined && trend !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              trendUp ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
            }`}>
              {trendUp ? <ArrowUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 truncate">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <p
          className="db-count-in text-[2rem] font-black tabular-nums tracking-tight leading-none text-foreground"
          style={{ animationDelay: `${delay + 60}ms` }}
        >
          {value}
        </p>
        {progress === undefined && (
          <div className="hidden sm:block w-20 shrink-0">
            <Sparkline values={sparkVals} color={v.spark} />
          </div>
        )}
      </div>

      {sub && <p className="text-xs text-muted-foreground mt-1.5 font-medium truncate">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3">
          <ProgressBar pct={progress} color={v.progress} />
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Section({ label, action, delay = 0, hint }: {
  label: string; action?: { text: string; to: string }; delay?: number; hint?: string;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="db-fade-up flex items-center gap-3" style={{ animationDelay: `${delay}ms` }}>
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground whitespace-nowrap">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">— {hint}</span>}
      <span className="h-px flex-1 bg-border/50" />
      {action && (
        <button
          onClick={() => navigate(action.to)}
          className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold transition-colors whitespace-nowrap"
        >
          {action.text}<ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── AI Insights panel ───────────────────────────────────────────────────────
interface Insight { tone: 'positive' | 'warning' | 'info'; text: string; }

function AIInsightsPanel({ insights, delay = 0 }: { insights: Insight[]; delay?: number }) {
  const toneMap = {
    positive: { dot: 'bg-emerald-500',  pill: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' },
    warning:  { dot: 'bg-amber-500',    pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60' },
    info:     { dot: 'bg-indigo-500',   pill: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60' },
  };

  return (
    <div className="db-fade-up db-insight p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Smart Insights</p>
            <p className="text-[10px] text-muted-foreground">AI summary · updated just now</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground border border-border/50 rounded-md px-1.5 py-0.5">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
          Live
        </span>
      </div>
      <ul className="space-y-2">
        {insights.length === 0 ? (
          <li className="text-sm text-muted-foreground py-4 text-center">No insights to surface yet check back soon.</li>
        ) : insights.map((i, idx) => (
          <li key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${toneMap[i.tone].pill}`}>
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${toneMap[i.tone].dot}`} />
            <p className="text-xs leading-relaxed">{i.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Activity feed item ───────────────────────────────────────────────────────
function ActivityItem({ icon: Icon, color, title, sub, time }: {
  icon: LucideIcon; color: string; title: string; sub?: string; time?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color} mt-0.5`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
      {time && <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{time}</span>}
    </div>
  );
}

// ─── Org row ──────────────────────────────────────────────────────────────────
function OrgRow({ org, onApprove, onReview }: {
  org: Record<string, unknown>;
  onApprove?: () => void;
  onReview?: () => void;
}) {
  const statusMap: Record<string, string> = {
    approved: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    active:   'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    pending:  'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
  };
  const status = (org.status as string) ?? 'pending';

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:border-border bg-background/50 hover:bg-muted/20 transition-all">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-foreground truncate">{(org.organisationName ?? org.id) as string}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{org.OrgEmail as string}</p>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border capitalize ${statusMap[status] ?? statusMap.pending}`}>
          {status}
        </span>
        {onApprove && (
          <>
            <Button size="sm" onClick={onApprove}
              className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onReview}
              className="h-7 text-xs px-3 rounded-lg">
              Review
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Widget shell with optional filter chips ─────────────────────────────────
function WidgetCard({
  title, icon: Icon, iconColor, action, filters, activeFilter, onFilter, delay = 0, children,
}: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  filters?: string[];
  activeFilter?: string;
  onFilter?: (f: string) => void;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="db-fade-up db-card overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40 gap-3">
        <p className="font-semibold text-sm flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="truncate">{title}</span>
        </p>
        <div className="flex items-center gap-2">
          {filters && filters.length > 0 && (
            <div className="hidden md:flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => onFilter?.(f)}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                    activeFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 whitespace-nowrap"
            >
              {action.icon && <action.icon className="h-3 w-3" />}
              {action.label} <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export function Dashboard() {
  useStyleInject();
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl border border-border/50 bg-muted/30 flex items-center justify-center mx-auto mb-5">
          <Circle className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <h2 className="text-xl font-semibold">Not signed in</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Please sign in to view the dashboard.</p>
      </div>
    );
  }

  const role = (currentUser.role?.toLowerCase() as string) ?? '';
  if (role === 'superadmin' || role === 'super_admin') return <SuperAdminDashboard currentUser={currentUser} />;
  if (role === 'orgadmin'  || role === 'org_admin'  || role === 'admin') return <OrgAdminDashboard currentUser={currentUser} />;
  return <UserDashboard currentUser={currentUser} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function SuperAdminDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const [, navigate] = useLocation();
  const { data: analyticsRes, isLoading: loadingAnalytics } = useAnalytics();
  const { data: pendingRes,   isLoading: loadingPending   } = usePendingOrganisations();
  const { data: orgsRes,      isLoading: loadingOrgs      } = useOrganisations();
  const { data: announcementsRes }                          = useAnnouncements();

  const analytics     = (analyticsRes as unknown as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const pending       = unwrapArray<Record<string, unknown>>(pendingRes);
  const orgs          = unwrapArray<Record<string, unknown>>(orgsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const approvedOrgs = orgs.filter(o => o.status === 'approved' || o.status === 'active').length;

  return (
    <div className="db-root space-y-6 pb-10">
      <div className="db-fade-up flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <WelcomeBanner userName={userName} role="super"
            subtitle="Platform-wide overview — manage organisations, users and system health." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      <QuickActions role="super" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orgs" loading={loadingOrgs} value={orgs.length}    icon={Building2}   variant="indigo"  delay={0}
          sub={`${approvedOrgs} active`} onClick={() => navigate('/organisations')} trend={8} spark={1} />
        <StatCard title="Pending Approvals" loading={loadingPending} value={pending.length} icon={Clock} variant={pending.length > 0 ? 'amber' : 'emerald'} delay={50}
          sub="Awaiting review" onClick={() => navigate('/organisations?tab=pending')} spark={2} />
        <StatCard title="Active Meetings" loading={loadingAnalytics} value={(analytics?.upcomingMeetings as unknown[])?.length ?? 0} icon={Calendar} variant="violet" delay={100}
          sub="Across all orgs" onClick={() => navigate('/meetings')} trend={12} spark={3} />
        <StatCard title="System Status" value="Healthy" icon={Shield} variant="emerald" delay={150}
          sub="All services up" spark={4} />
      </div>

      {!loadingPending && pending.length > 0 && (
        <div className="db-fade-up db-card-flat border-amber-300/50 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-950/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Pending Approvals</p>
                <p className="text-xs text-muted-foreground">{pending.length} organisation{pending.length !== 1 ? 's' : ''} awaiting review</p>
              </div>
            </div>
            <Button size="sm" variant="outline"
              className="h-8 text-xs px-3 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50"
              onClick={() => navigate('/organisations?tab=pending')}>
              View all <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 4).map(org => (
              <OrgRow key={org.organisationId as string} org={org}
                onApprove={() => {}} onReview={() => navigate(`/organisations/${org.organisationId}`)} />
            ))}
          </div>
        </div>
      )}

      <Section label="Organisations" action={{ text: 'View all', to: '/organisations' }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard title="Registered Organisations" icon={Building2} iconColor="text-indigo-500"
          action={{ label: 'See all', onClick: () => navigate('/organisations') }} delay={20}>
          {loadingOrgs ? <WidgetSkel rows={4} h={52} /> : (
            <div className="space-y-2">
              {orgs.slice(0, 5).map(org => (
                <OrgRow key={org.organisationId as string} org={org}
                  onReview={() => navigate(`/organisations/${org.organisationId}`)} />
              ))}
              {orgs.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No organisations registered yet.</div>
              )}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Platform Activity" icon={Activity} iconColor="text-violet-500" delay={60}>
          {(loadingAnalytics || loadingOrgs || loadingPending) ? <WidgetSkel rows={5} h={40} /> : (
            <div>
              {[
                { label: 'Registered organisations', value: orgs.length,    pct: (orgs.length / Math.max(orgs.length, 1)) * 100, color: 'bg-indigo-500' },
                { label: 'Pending approvals',        value: pending.length, pct: pending.length * 20, color: 'bg-amber-500' },
                { label: 'Active meetings',          value: (analytics?.upcomingMeetings as unknown[])?.length ?? 0, pct: 65, color: 'bg-violet-500' },
                { label: 'Open tasks',               value: (analytics?.openTasks as unknown[])?.length ?? 0, pct: 40, color: 'bg-sky-500' },
              ].map(row => (
                <div key={row.label} className="py-3 border-b border-border/40 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="font-bold text-sm tabular-nums">{row.value}</span>
                  </div>
                  <ProgressBar pct={row.pct} color={row.color} />
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function OrgAdminDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const [, navigate] = useLocation();
  const { data: analyticsRes, isLoading: loadingAnalytics } = useAnalytics();
  const { data: financeRes,   isLoading: loadingFinance   } = useFinanceOverview();
  // Use the full org-wide meetings list, not `useMyMeetings`. Admins
  // need to see every upcoming meeting in the org, including ones they
  // created but aren't an attendee of — otherwise this widget renders
  // empty while the Meetings page (which uses `useMeetings`) shows them.
  const { data: meetingsRes,  isLoading: loadingMeetings  } = useMeetings({ page: 1, limit: 50 });
  const { data: tasksRes,     isLoading: loadingTasks     } = useTasks();
  const { data: pollsRes,     isLoading: loadingPolls     } = usePolls();
  const { data: announcementsRes }                          = useAnnouncements();
  const { data: documentsRes, isLoading: loadingDocuments } = useDocuments({ limit: 5 });

  const analytics     = (analyticsRes as unknown as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const finance       = (financeRes   as unknown as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const meetings      = unwrapArray<Record<string, unknown>>(meetingsRes);
  const tasks         = unwrapArray<Record<string, unknown>>(tasksRes);
  const polls         = unwrapArray<Poll>(pollsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);
  const documents     = unwrapArray<Record<string, unknown>>(documentsRes);

  const upcoming    = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const openTasks   = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'completed');
  const doneTasks   = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'completed');

  // Task filter chip state
  const [taskFilter, setTaskFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const filteredTasksBase = useMemo(() => {
    if (taskFilter === 'Open') return openTasks;
    if (taskFilter === 'Done') return doneTasks;
    return tasks;
  }, [taskFilter, tasks, openTasks, doneTasks]);
  const widgetTasks = filteredTasksBase.slice(0, 5).map(t => ({ ...t, dueDate: taskDueMs(t), deadline: undefined }));

  const recentDocs  = documents.slice(0, 5).map(d => ({
    id: d.id, title: d.title, fileName: d.fileName, fileUrl: d.fileUrl,
    fileType: d.fileType, fileSize: d.fileSize,
    tags: (d.tags as string[]) ?? [], version: (d.version as number) ?? 1,
    uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
    accessLevel: (d.accessLevel as string) ?? 'VIEWER',
  }));

  const budget      = finance?.budget as Record<string, unknown> | undefined;
  const totalBudget = ((budget?.total as Record<string, unknown>)?.amount as number) ?? 0;
  const spentBudget = ((budget?.spent as Record<string, unknown>)?.amount as number) ?? 0;
  const budgetPct   = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const attendanceTrend = ((analytics?.attendanceTrend as Record<string, unknown>[]) ?? []).map(
    t => ({ month: t.month as string, attendance: t.value as number })
  );

  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteItems: CommandItem[] = useMemo(() => [
    { label: 'New Meeting',      icon: Calendar,  to: '/meetings/new',   group: 'Create' },
    { label: 'Create Task',      icon: ListTodo,  to: '/tasks/new',      group: 'Create' },
    { label: 'New Announcement', icon: Megaphone, to: '/announcements',  group: 'Create' },
    { label: 'Upload Document',  icon: FileText,  to: '/documents',      group: 'Create' },
    { label: 'Meetings',         icon: Calendar,  to: '/meetings',       group: 'Navigate' },
    { label: 'Tasks',            icon: ListTodo,  to: '/tasks',          group: 'Navigate' },
    { label: 'Documents',        icon: FileText,  to: '/documents',      group: 'Navigate' },
    { label: 'Polls & Voting',   icon: Vote,      to: '/voting',         group: 'Navigate' },
    { label: 'Reports',          icon: BarChart3, to: '/reports',        group: 'Navigate' },
    { label: 'Announcements',    icon: Megaphone, to: '/announcements',  group: 'Navigate' },
    ...upcoming.slice(0, 3).map(m => ({
      label: m.title, icon: Calendar, to: '/meetings', group: 'Recent meetings' as const,
    })),
  ], [upcoming]);

  const fabItems = [
    { label: 'New Meeting',      icon: Calendar,  to: '/meetings/new',  color: 'bg-card text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
    { label: 'Create Task',      icon: ListTodo,  to: '/tasks/new',     color: 'bg-card text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
    { label: 'New Announcement', icon: Megaphone, to: '/announcements', color: 'bg-card text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
    { label: 'Upload Document',  icon: FileText,  to: '/documents',     color: 'bg-card text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  ];

  // AI insights (deterministic, derived from data)
  const insights: Insight[] = useMemo(() => {
    const out: Insight[] = [];
    if (upcoming.length > 0) {
      out.push({ tone: 'info', text: `You have ${upcoming.length} meeting${upcoming.length !== 1 ? 's' : ''} coming up — earliest is "${upcoming[0].title}".` });
    }
    if (openTasks.length > 5) {
      out.push({ tone: 'warning', text: `${openTasks.length} open tasks pending. Consider delegating or breaking them down to keep velocity up.` });
    } else if (completionRate >= 75 && tasks.length > 0) {
      out.push({ tone: 'positive', text: `Excellent progress — ${completionRate}% task completion this period.` });
    }
    if (budgetPct > 80) {
      out.push({ tone: 'warning', text: `Budget at ${budgetPct}% utilization — review spend before the quarter closes.` });
    } else if (totalBudget > 0 && budgetPct < 50) {
      out.push({ tone: 'positive', text: `Budget healthy at ${budgetPct}% used — room for strategic investments.` });
    }
    if (polls.length > 0) {
      out.push({ tone: 'info', text: `${polls.length} active poll${polls.length !== 1 ? 's' : ''} awaiting board votes.` });
    }
    if (out.length === 0) {
      out.push({ tone: 'info', text: 'All quiet — a good moment to plan the next board cycle.' });
    }
    return out.slice(0, 4);
  }, [upcoming, openTasks.length, completionRate, tasks.length, budgetPct, totalBudget, polls.length]);

  return (
    <div className="db-root space-y-6 pb-24">
      {/* Header */}
      <div className="db-fade-up flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <WelcomeBanner userName={userName} role="admin"
            subtitle="Manage your organisation — track meetings, tasks, budget and board activity." />
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300 sm:inline-flex"
          >
            <a
              href={ANDROID_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Smartphone className="h-4 w-4" />
              Download Android App
            </a>
          </Button>
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      <QuickActions role="admin" onOpenPalette={() => setPaletteOpen(true)} />

      {/* Stats — render progressively, no global gating */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Meetings" loading={loadingMeetings} value={upcoming.length}
          icon={Calendar} variant="indigo" delay={0}
          sub={`${meetings.length} total`} onClick={() => navigate('/meetings')} trend={6} spark={11} />
        <StatCard title="Open Tasks" loading={loadingTasks} value={openTasks.length}
          icon={ListTodo} variant={openTasks.length > 5 ? 'amber' : 'violet'} delay={40}
          sub={`${completionRate}% complete`} progress={completionRate}
          onClick={() => navigate('/tasks')} spark={12} />
        <StatCard title="Active Polls" loading={loadingPolls} value={polls.length}
          icon={Vote} variant="emerald" delay={80}
          sub="Votes open" onClick={() => navigate('/voting')} trend={3} spark={13} />
        <StatCard title="Budget Used" loading={loadingFinance} value={`${budgetPct}%`}
          icon={TrendingUp} variant={budgetPct > 80 ? 'rose' : 'indigo'} delay={120}
          sub={totalBudget > 0 ? `$${spentBudget.toLocaleString()} of $${totalBudget.toLocaleString()}` : 'No budget set'}
          progress={budgetPct} spark={14} />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={insights} delay={20} />

      <Section label="Board Activity" hint="Live data" action={{ text: 'View reports', to: '/reports' }} />

      {/* Widget grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left col */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <WidgetCard title="Upcoming Meetings" icon={Calendar} iconColor="text-indigo-500"
            action={{ label: 'All', onClick: () => navigate('/meetings') }} delay={0}>
            {loadingMeetings ? <WidgetSkel rows={3} h={56} /> : <UpcomingMeetingsWidget meetings={upcoming} meetingsRoute="/meetings" />}
          </WidgetCard>

          <WidgetCard title="Smart Reminders" icon={Clock} iconColor="text-rose-500" delay={20}>
            {(loadingTasks || loadingMeetings)
              ? <WidgetSkel rows={3} h={48} />
              : <SmartRemindersWidget tasks={tasks} meetings={meetings} taskRoute="/tasks" meetingRoute="/meetings" />}
          </WidgetCard>

          <WidgetCard title="Attendance Trend" icon={Users} iconColor="text-violet-500" delay={40}>
            {loadingAnalytics ? <WidgetSkel rows={3} /> : <AttendanceWidget attendanceTrend={attendanceTrend} />}
          </WidgetCard>
        </div>

        {/* Middle col */}
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <WidgetCard
            title="Tasks"
            icon={ListTodo}
            iconColor="text-amber-500"
            filters={['All', 'Open', 'Done']}
            activeFilter={taskFilter}
            onFilter={(f) => setTaskFilter(f as 'All' | 'Open' | 'Done')}
            action={{ label: 'Add', onClick: () => navigate('/tasks/new'), icon: Plus }}
            delay={20}
          >
            {loadingTasks ? <WidgetSkel rows={4} h={52} /> : (
              widgetTasks.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground text-center">No {taskFilter.toLowerCase()} tasks.</p>
              ) : <OpenActionsWidget tasks={widgetTasks as any} />
            )}
          </WidgetCard>

          <WidgetCard title="Polls & Voting" icon={Vote} iconColor="text-emerald-500"
            action={{ label: 'All', onClick: () => navigate('/voting') }} delay={60}>
            {loadingPolls ? <WidgetSkel rows={3} /> : <VotingOverviewWidget polls={polls.slice(0, 4) as any} />}
          </WidgetCard>
        </div>

        {/* Right col */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          <WidgetCard title="Budget" icon={BarChart3} iconColor="text-rose-500" delay={40}>
            {loadingFinance ? <WidgetSkel rows={4} /> : (
              <BudgetSummaryWidget budgetSummary={{ totalAllocated: totalBudget, totalSpent: spentBudget, percentage: budgetPct }} />
            )}
          </WidgetCard>

          <WidgetCard title="Recent Docs" icon={FileText} iconColor="text-sky-500"
            action={{ label: 'All', onClick: () => navigate('/documents') }} delay={80}>
            {loadingDocuments ? <WidgetSkel rows={3} /> : <RecentDocumentsWidget documents={recentDocs as any} />}
          </WidgetCard>

          {/* Activity timeline */}
          <div className="db-fade-up db-card overflow-hidden" style={{ animationDelay: '120ms' }}>
            <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />Activity Timeline
              </p>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 db-pulse-dot" />
                Live
              </span>
            </div>
            <div className="px-4 py-2 relative">
              {(loadingTasks && loadingMeetings) ? <WidgetSkel rows={4} h={32} /> : (
                <div className="relative pl-4">
                  <span className="absolute left-[6px] top-2 bottom-2 w-px bg-border/60" />
                  {upcoming.slice(0, 2).map((m, i) => (
                    <div key={m.id} className="relative">
                      <span className="absolute -left-[15px] top-3 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-card" style={{ animationDelay: `${i * 50}ms` }} />
                      <ActivityItem icon={Calendar}
                        color="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                        title={m.title} sub="Upcoming meeting" time={fmtRelative(m.startAt)} />
                    </div>
                  ))}
                  {openTasks.slice(0, 2).map(t => (
                    <div key={t.id as string} className="relative">
                      <span className="absolute -left-[15px] top-3 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-card" />
                      <ActivityItem icon={ListTodo}
                        color="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                        title={(t.title ?? t.name ?? 'Task') as string}
                        sub={(t.status as string) ?? ''} />
                    </div>
                  ))}
                  {announcements.slice(0, 1).map(a => (
                    <div key={a.id} className="relative">
                      <span className="absolute -left-[15px] top-3 h-2.5 w-2.5 rounded-full bg-violet-500 ring-4 ring-card" />
                      <ActivityItem icon={Megaphone}
                        color="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
                        title={a.title} sub="Announcement" time={fmtRelative(a.publishedAt)} />
                    </div>
                  ))}
                  {(upcoming.length + openTasks.length + announcements.length) === 0 && (
                    <p className="py-6 text-sm text-muted-foreground text-center">No recent activity.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating quick-create */}
      <QuickCreateFab items={fabItems} />

      {/* Command palette */}
      <CommandPalette items={paletteItems} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function UserDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const [, navigate] = useLocation();
  const { data: meetingsRes,      isLoading: loadingMeetings   } = useMyMeetings();
  const { data: announcementsRes                               } = useAnnouncements();
  const { data: documentsRes,     isLoading: loadingDocuments  } = useDocuments({ limit: 5 });
  const { data: tasksRes,         isLoading: loadingTasks      } = useTasks();
  const { data: pollsRes,         isLoading: loadingPolls      } = usePolls();

  const meetings      = unwrapArray<Record<string, unknown>>(meetingsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);
  const documents     = unwrapArray<Record<string, unknown>>(documentsRes);
  const tasks         = unwrapArray<Record<string, unknown>>(tasksRes);
  const polls         = unwrapArray<Poll>(pollsRes);

  const upcoming      = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const openTasks     = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'completed');
  const doneTasks     = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'completed');
  const widgetTasks   = tasks.slice(0, 5).map(t => ({ ...t, dueDate: taskDueMs(t), deadline: undefined }));
  const recentDocs    = documents.slice(0, 5).map(d => ({
    id: d.id, title: d.title, fileName: d.fileName, fileUrl: d.fileUrl,
    fileType: d.fileType, fileSize: d.fileSize,
    tags: (d.tags as string[]) ?? [], version: (d.version as number) ?? 1,
    uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
    accessLevel: (d.accessLevel as string) ?? 'VIEWER',
  }));

  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  return (
    <div className="db-root space-y-6 pb-10">
      <div className="db-fade-up flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <WelcomeBanner userName={userName} role="user"
            subtitle="Stay on top of your meetings, tasks and board commitments." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      <QuickActions role="user" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Meetings" loading={loadingMeetings} value={upcoming.length}    icon={Calendar}  variant="indigo"  delay={0}
          sub={`${meetings.length} total`}   onClick={() => navigate('/meetings')} spark={21} />
        <StatCard title="My Tasks" loading={loadingTasks} value={openTasks.length}   icon={ListTodo}  variant="amber"   delay={40}
          sub={`${completionRate}% done`} progress={completionRate} onClick={() => navigate('/tasks')} spark={22} />
        <StatCard title="Active Polls" loading={loadingPolls} value={polls.length}       icon={Vote}      variant="emerald" delay={80}
          sub="Cast your vote"           onClick={() => navigate('/voting')} spark={23} />
        <StatCard title="Documents" loading={loadingDocuments} value={documents.length}   icon={FileText}  variant="violet"  delay={120}
          sub="Available to you"         onClick={() => navigate('/documents')} spark={24} />
      </div>

      <Section label="My Board Activity" action={{ text: 'See all tasks', to: '/tasks' }} />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <WidgetCard title="My Meetings" icon={Calendar} iconColor="text-indigo-500"
            action={{ label: 'All', onClick: () => navigate('/meetings') }} delay={0}>
            {loadingMeetings ? <WidgetSkel rows={3} h={56} /> : <UpcomingMeetingsWidget meetings={upcoming} meetingsRoute="/meetings" />}
          </WidgetCard>

          <WidgetCard title="Smart Reminders" icon={Clock} iconColor="text-rose-500" delay={20}>
            {(loadingTasks || loadingMeetings)
              ? <WidgetSkel rows={3} h={48} />
              : <SmartRemindersWidget tasks={tasks} meetings={meetings} taskRoute="/tasks" meetingRoute="/meetings" />}
          </WidgetCard>

          <div className="db-fade-up db-card p-5" style={{ animationDelay: '40ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-semibold text-sm">Task Progress</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-bold">{completionRate}%</span>
              </div>
              <ProgressBar pct={completionRate} color="bg-emerald-500" />
              <div className="grid grid-cols-2 gap-3 mt-1">
                {[
                  { label: 'Open',      value: openTasks.length, color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Completed', value: doneTasks.length, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                    <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-5">
          <WidgetCard title="My Tasks" icon={ListTodo} iconColor="text-amber-500"
            action={{ label: 'View all', onClick: () => navigate('/tasks') }} delay={40}>
            {loadingTasks ? <WidgetSkel rows={4} h={52} /> : <OpenActionsWidget tasks={widgetTasks as any} />}
          </WidgetCard>

          <WidgetCard title="Active Polls" icon={Vote} iconColor="text-emerald-500"
            action={{ label: 'Vote', onClick: () => navigate('/voting') }} delay={80}>
            {loadingPolls ? <WidgetSkel rows={3} /> : <VotingOverviewWidget polls={polls.slice(0, 4) as any} />}
          </WidgetCard>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-5" data-section="dash-r2">

          <WidgetCard title="Documents" icon={FileText} iconColor="text-sky-500"
            action={{ label: 'All', onClick: () => navigate('/documents') }} delay={80}>
            {loadingDocuments ? <WidgetSkel rows={3} /> : <RecentDocumentsWidget documents={recentDocs as any} />}
          </WidgetCard>

          <WidgetCard title="Announcements" icon={Megaphone} iconColor="text-violet-500"
            action={{ label: 'All', onClick: () => navigate('/announcements') }} delay={120}>
            {announcements.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground text-center">No announcements.</p>
            ) : (
              announcements.slice(0, 3).map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate('/announcements')}
                  className="w-full text-left py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    {a.isPinned && <Pin className="h-3 w-3 text-indigo-500 mt-1 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.content}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{fmtRelative(a.publishedAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </WidgetCard>

          <div className="db-fade-up" style={{ animationDelay: '160ms' }}>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />Refresh dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
