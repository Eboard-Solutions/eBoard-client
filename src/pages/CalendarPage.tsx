import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { startOfWeek, isSameDay, isWithinInterval, addDays } from "date-fns";
import { parse } from "date-fns/parse";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  AlertTriangle,
  CheckSquare,
  Users,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calendarService,
  CALENDAR_QUERY_KEYS,
} from "../api/services/calendar.service";

import "react-big-calendar/lib/css/react-big-calendar.css";
import type { CalendarEvent } from "@/types/api.types";

// ─── Setup ────────────────────────────────────────────────────────────────────

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type EventType = CalendarEvent["type"];
type FilterKey = "all" | EventType;

// Map event types to a coordinated palette. Each entry drives the dot, the
// gradient on the rendered event chip, and the filter pill.
type TypeStyle = {
  label: string;
  chip: string;
  dot: string;
  gradient: string;
  icon: typeof Users;
};
const TYPE_STYLES: Record<EventType, TypeStyle> = {
  meeting: {
    label: "Meetings",
    chip: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
    dot: "bg-indigo-500",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    icon: Users,
  },
  task: {
    label: "Tasks",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    dot: "bg-emerald-500",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    icon: CheckSquare,
  },
  actionItem: {
    label: "Action items",
    chip: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    icon: Sparkles,
  },
  agendaItem: {
    label: "Agenda items",
    chip: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    dot: "bg-violet-500",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    icon: CalendarRange,
  },
};

const FALLBACK_GRADIENT = "linear-gradient(135deg, #64748b 0%, #475569 100%)";

// ─── Custom toolbar ───────────────────────────────────────────────────────────
// Replaces react-big-calendar's default top bar with a layout matched to the
// rest of the app: title on the left, view switcher on the right, with a
// segmented "today / prev / next" control in the middle.

interface ToolbarProps {
  label: string;
  view: View;
  views: View[];
  onView: (v: View) => void;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
}

function CalendarToolbar({ label, view, views, onView, onNavigate }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 pb-4">
      {/* Nav cluster */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 rounded-xl text-xs font-semibold"
          onClick={() => onNavigate("TODAY")}
        >
          Today
        </Button>
        <div className="flex items-center rounded-xl border border-border/60 overflow-hidden bg-card">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => onNavigate("PREV")}
            className="h-9 px-2.5 hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-bold tracking-tight tabular-nums select-none border-x border-border/60 h-9 flex items-center min-w-[140px] justify-center">
            {label}
          </span>
          <button
            type="button"
            aria-label="Next"
            onClick={() => onNavigate("NEXT")}
            className="h-9 px-2.5 hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl border border-border/30 p-1 self-start sm:self-auto">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`h-8 px-3 rounded-lg transition-all text-xs font-semibold capitalize ${
              view === v
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Custom event chip ────────────────────────────────────────────────────────
// react-big-calendar renders events as a flat colored bar by default; our
// renderer gives them a tiny icon + slightly nicer typography.

function EventChip({ event }: { event: CalendarEvent }) {
  const cfg = TYPE_STYLES[event.type];
  const Icon = cfg?.icon ?? Sparkles;
  return (
    <span className="flex items-center gap-1.5 truncate text-[11.5px] font-semibold leading-none">
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.5} />
      <span className="truncate">{event.title}</span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: CALENDAR_QUERY_KEYS.all,
    queryFn: calendarService.getEvents,
  });

  const allEvents: CalendarEvent[] = useMemo(() => events ?? [], [events]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  // Counts shown in the stat tiles. `thisWeek` covers a rolling 7-day window
  // from the calendar's current "now" date, which is more intuitive than ISO
  // weeks since Sunday-start vs Monday-start would confuse users.
  const stats = useMemo(() => {
    const today = new Date();
    const weekEnd = addDays(today, 7);
    let meetings = 0;
    let tasks = 0;
    let todayCount = 0;
    let weekCount = 0;
    for (const e of allEvents) {
      const start = new Date(e.start);
      if (e.type === "meeting") meetings++;
      else if (e.type === "task") tasks++;
      if (isSameDay(start, today)) todayCount++;
      if (isWithinInterval(start, { start: today, end: weekEnd })) weekCount++;
    }
    return {
      total: allEvents.length,
      meetings,
      tasks,
      today: todayCount,
      week: weekCount,
    };
  }, [allEvents]);

  const filtered = useMemo(
    () =>
      activeFilter === "all"
        ? allEvents
        : allEvents.filter((e) => e.type === activeFilter),
    [allEvents, activeFilter],
  );

  // ── Event styling ──────────────────────────────────────────────────────────
  // We push the visual treatment through `eventPropGetter` so react-big-
  // calendar's internal layout still owns positioning — we only override
  // colour, radius, and shadow.
  const eventStyleGetter = (event: CalendarEvent) => {
    const cfg = TYPE_STYLES[event.type];
    return {
      style: {
        background: cfg?.gradient ?? FALLBACK_GRADIENT,
        borderRadius: 8,
        color: "white",
        border: "0px",
        padding: "3px 8px",
        boxShadow:
          "0 2px 6px -2px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.18)",
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setLocation(event.url);
  };

  const views = useMemo(() => ["month", "week", "day", "agenda"] as View[], []);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-12 -bottom-16 h-40 w-40 rounded-full bg-black/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-sm" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                Organisation
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Calendar
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1.5 max-w-xl">
                Every meeting, task, and action item in one view. Click any
                event to jump straight to its detail page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-9 gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat strip — sits inside the hero card, blends with the gradient */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: "Total", value: stats.total, icon: CalendarRange },
            { label: "Today", value: stats.today, icon: Sparkles },
            { label: "Next 7 days", value: stats.week, icon: CalendarIcon },
            { label: "Meetings", value: stats.meetings, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl bg-white/10 hover:bg-white/15 transition-colors border border-white/15 backdrop-blur px-3 sm:px-4 py-3"
            >
              <div className="flex items-center gap-1.5 text-white/70">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums leading-none">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </div>
        <FilterPill
          label="All"
          count={stats.total}
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          dotClass="bg-slate-400"
        />
        <FilterPill
          label="Meetings"
          count={stats.meetings}
          active={activeFilter === "meeting"}
          onClick={() => setActiveFilter("meeting")}
          dotClass={TYPE_STYLES.meeting.dot}
        />
        <FilterPill
          label="Tasks"
          count={stats.tasks}
          active={activeFilter === "task"}
          onClick={() => setActiveFilter("task")}
          dotClass={TYPE_STYLES.task.dot}
        />

        {/* Legend — visible on >= sm so the filter row doesn't wrap into a
            cluttered stack on phones. */}
        <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color={TYPE_STYLES.meeting.dot} label="Meeting" />
          <LegendDot color={TYPE_STYLES.task.dot} label="Task" />
        </div>
      </div>

      {/* ── Calendar shell ───────────────────────────────────────────────── */}
      {isError ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 p-5 sm:p-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-700 dark:text-red-300">
              Failed to load calendar events
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-300/70 mt-0.5">
              Something went wrong while fetching events. Check your connection
              and try again.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="self-start">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <CalendarSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState filter={activeFilter} />
            ) : (
              <Calendar<CalendarEvent>
                localizer={localizer}
                events={filtered}
                startAccessor="start"
                endAccessor="end"
                date={currentDate}
                view={currentView}
                onNavigate={(newDate) => setCurrentDate(newDate)}
                onView={(newView) => setCurrentView(newView)}
                views={views}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                tooltipAccessor={(event) =>
                  `${event.title}\nLocation: ${event.location || "N/A"}`
                }
                components={{
                  toolbar: (props) => (
                    <CalendarToolbar
                      label={props.label}
                      view={props.view}
                      views={views}
                      onView={props.onView}
                      onNavigate={(a) => props.onNavigate(a)}
                    />
                  ),
                  event: ({ event }) => <EventChip event={event} />,
                }}
                style={{ height: "clamp(560px, 70vh, 820px)" }}
                className="rbc-modern font-sans"
              />
            )}
          </div>
        </div>
      )}

      {/* Inline CSS overrides for react-big-calendar so it inherits the
          app's design language (rounded corners, soft borders, dark-mode
          contrast). Scoped via the `rbc-modern` class so it can't leak. */}
      <style>{rbcOverrides}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterPill({
  label,
  count,
  active,
  onClick,
  dotClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dotClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
        active
          ? "bg-foreground text-background border-foreground shadow-sm"
          : "bg-card hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
      <span
        className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums ${
          active
            ? "bg-background/20 text-background"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="font-medium">{label}</span>
    </span>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded-xl bg-muted/60" />
        <div className="h-9 w-56 rounded-xl bg-muted/60" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 px-6">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold">
        {filter === "all"
          ? "No events scheduled"
          : filter === "meeting"
            ? "No meetings yet"
            : "No tasks yet"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Once events are scheduled they'll appear here, colour-coded by type.
      </p>
    </div>
  );
}

// ─── CSS overrides ────────────────────────────────────────────────────────────
// react-big-calendar ships its own stylesheet (imported above). These rules
// re-skin it to fit the app: softer borders, rounded corners, today highlight,
// dark-mode contrast, and a calmer typography scale. Scoped to `.rbc-modern`.

const rbcOverrides = `
  .rbc-modern .rbc-month-view,
  .rbc-modern .rbc-time-view,
  .rbc-modern .rbc-agenda-view {
    border: 1px solid hsl(var(--border));
    border-radius: 16px;
    overflow: hidden;
    background: hsl(var(--card));
  }
  .rbc-modern .rbc-month-header,
  .rbc-modern .rbc-time-header {
    background: hsl(var(--muted) / 0.4);
  }
  .rbc-modern .rbc-header {
    border-bottom: 1px solid hsl(var(--border));
    padding: 10px 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: hsl(var(--muted-foreground));
  }
  .rbc-modern .rbc-month-row + .rbc-month-row,
  .rbc-modern .rbc-day-bg + .rbc-day-bg,
  .rbc-modern .rbc-header + .rbc-header {
    border-color: hsl(var(--border));
  }
  .rbc-modern .rbc-date-cell {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
    text-align: right;
    color: hsl(var(--foreground));
  }
  .rbc-modern .rbc-date-cell.rbc-off-range {
    color: hsl(var(--muted-foreground) / 0.45);
  }
  .rbc-modern .rbc-today {
    background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(59,130,246,0.06));
  }
  .rbc-modern .rbc-date-cell.rbc-now > .rbc-button-link {
    color: rgb(79 70 229);
    font-weight: 800;
  }
  .rbc-modern .rbc-event {
    border: none !important;
    font-size: 11.5px !important;
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  .rbc-modern .rbc-event:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px -4px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .rbc-modern .rbc-show-more {
    color: rgb(79 70 229);
    font-weight: 600;
    font-size: 11px;
    background: transparent;
  }
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table {
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr > td,
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
    padding: 12px;
    font-size: 12px;
    border-color: hsl(var(--border));
  }
  .rbc-modern .rbc-time-content {
    border-color: hsl(var(--border));
  }
  .rbc-modern .rbc-time-slot {
    color: hsl(var(--muted-foreground));
    font-size: 10.5px;
  }
  .rbc-modern .rbc-current-time-indicator {
    background-color: rgb(99 102 241);
    height: 2px;
  }
  /* Dark mode tweaks — the library uses fixed colours otherwise. */
  .dark .rbc-modern .rbc-today {
    background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(59,130,246,0.10));
  }
  .dark .rbc-modern .rbc-off-range-bg {
    background: hsl(var(--muted) / 0.3);
  }
`;
