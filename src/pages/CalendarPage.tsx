import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type DateHeaderProps,
} from "react-big-calendar";
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
  Search,
  X,
  ListChecks,
  ClipboardList,
  Bell,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Map every event type to a coordinated palette. The user asked for blue
// meetings, green tasks, orange reviews (actionItem), purple agendas; we also
// keep a red "deadline" entry that the renderer can detect via the title (no
// new server field needed) for tasks marked DUE/Deadline.
type TypeStyle = {
  label: string;
  chip: string;
  dot: string;
  gradient: string;
  ring: string;
  icon: typeof Users;
};
const TYPE_STYLES: Record<EventType, TypeStyle> = {
  meeting: {
    label: "Meetings",
    chip: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    dot: "bg-blue-500",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    ring: "ring-blue-400/50",
    icon: Users,
  },
  task: {
    label: "Tasks",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    dot: "bg-emerald-500",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    ring: "ring-emerald-400/50",
    icon: CheckSquare,
  },
  actionItem: {
    label: "Reviews",
    chip: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    ring: "ring-amber-400/50",
    icon: ClipboardList,
  },
  agendaItem: {
    label: "Agendas",
    chip: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    dot: "bg-violet-500",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    ring: "ring-violet-400/50",
    icon: ListChecks,
  },
};

// Deadline override — applied dynamically when an event's title hints at one.
// We don't want to change the data model just to colour-code, so the renderer
// inspects the title for keywords (case-insensitive). Cheap, accurate enough.
const DEADLINE_STYLE: TypeStyle = {
  label: "Deadlines",
  chip: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  dot: "bg-rose-500",
  gradient: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
  ring: "ring-rose-400/50",
  icon: Bell,
};

const DEADLINE_RE = /\b(deadline|due|overdue)\b/i;

function styleFor(event: CalendarEvent): TypeStyle {
  if (DEADLINE_RE.test(event.title)) return DEADLINE_STYLE;
  return TYPE_STYLES[event.type];
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────

interface ToolbarProps {
  label: string;
  view: View;
  views: View[];
  onView: (v: View) => void;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  search: string;
  onSearch: (v: string) => void;
}

const VIEW_ICONS: Record<View, typeof CalendarIcon> = {
  month: CalendarRange,
  week: CalendarIcon,
  day: Sparkles,
  agenda: ListChecks,
  work_week: CalendarIcon,
};

function CalendarToolbar({
  label,
  view,
  views,
  onView,
  onNavigate,
  search,
  onSearch,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-1 pb-5">
      {/* Left: nav cluster */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 rounded-full text-xs font-bold tracking-wide"
          onClick={() => onNavigate("TODAY")}
        >
          Today
        </Button>
        <div className="flex items-center rounded-full border border-border/60 bg-card overflow-hidden">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => onNavigate("PREV")}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-4 text-sm font-extrabold tracking-tight tabular-nums select-none border-x border-border/60 h-9 flex items-center min-w-[150px] justify-center">
            {label}
          </span>
          <button
            type="button"
            aria-label="Next"
            onClick={() => onNavigate("NEXT")}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Middle: search */}
      <div className="relative flex-1 max-w-xs lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search events…"
          className="h-9 pl-9 pr-8 rounded-full text-sm border-border/60 bg-card"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right: view switcher with icons */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-full border border-border/30 p-1 self-start lg:self-auto">
        {views.map((v) => {
          const Icon = VIEW_ICONS[v] ?? CalendarIcon;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={`h-8 px-3 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold capitalize ${
                view === v
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom date-cell header ─────────────────────────────────────────────────
// Replaces the default numeric label with a 28px chip that turns into a filled
// indigo circle on the current day. Hover on any cell reveals a quick-add
// button (visual affordance only — wires through to `onQuickAdd`).

function makeDateHeader(opts: { onQuickAdd?: (date: Date) => void }) {
  return function DateHeader({ date, label, isOffRange }: DateHeaderProps) {
    const today = isSameDay(date, new Date());
    return (
      <div className="flex items-center justify-between w-full">
        {opts.onQuickAdd && !isOffRange && (
          <button
            type="button"
            aria-label={`Add event on ${format(date, "MMM d")}`}
            onClick={(e) => {
              e.stopPropagation();
              opts.onQuickAdd?.(date);
            }}
            className="opacity-0 group-hover/cell:opacity-100 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm hover:bg-indigo-700 transition-all ml-1"
          >
            <Plus className="h-3 w-3" strokeWidth={3} />
          </button>
        )}
        <span className="flex-1" />
        <span
          className={`inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full text-[12px] font-bold tabular-nums transition-all ${
            today
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-white dark:ring-gray-950"
              : isOffRange
                ? "text-muted-foreground/45"
                : "text-foreground hover:bg-muted/60"
          }`}
        >
          {label}
        </span>
      </div>
    );
  };
}

// ─── Custom event chip ────────────────────────────────────────────────────────

function EventChip({ event }: { event: CalendarEvent }) {
  const cfg = styleFor(event);
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1.5 truncate text-[11.5px] font-semibold leading-none">
      <Icon className="h-3 w-3 shrink-0 opacity-95" strokeWidth={2.5} />
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
  const [search, setSearch] = useState("");

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: CALENDAR_QUERY_KEYS.all,
    queryFn: calendarService.getEvents,
  });

  const allEvents: CalendarEvent[] = useMemo(() => events ?? [], [events]);

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

  // ── Filtering: type + search ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allEvents;
    if (activeFilter !== "all") {
      list = list.filter((e) => e.type === activeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [allEvents, activeFilter, search]);

  // ── Per-event visual treatment via eventPropGetter. We keep react-big-
  // calendar's layout; only override the visuals on the chip itself.
  const eventStyleGetter = (event: CalendarEvent) => {
    const cfg = styleFor(event);
    return {
      style: {
        background: cfg.gradient,
        borderRadius: 999, // full pill
        color: "white",
        border: "0px",
        padding: "4px 10px",
        boxShadow:
          "0 2px 8px -2px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.22)",
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setLocation(event.url);
  };

  const views = useMemo(() => ["month", "week", "day", "agenda"] as View[], []);

  const DateHeader = useMemo(() => makeDateHeader({}), []);

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
              <CalendarIcon
                className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-sm"
                strokeWidth={2.25}
              />
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
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat strip embedded in the hero */}
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

        {/* Legend on >= sm */}
        <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color={TYPE_STYLES.meeting.dot} label="Meeting" />
          <LegendDot color={TYPE_STYLES.task.dot} label="Task" />
          <LegendDot color={TYPE_STYLES.agendaItem.dot} label="Agenda" />
          <LegendDot color={TYPE_STYLES.actionItem.dot} label="Review" />
          <LegendDot color={DEADLINE_STYLE.dot} label="Deadline" />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="self-start"
          >
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
              <EmptyState filter={activeFilter} searching={!!search.trim()} />
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
                popup
                tooltipAccessor={(event) =>
                  [
                    event.title,
                    event.location ? `Location: ${event.location}` : null,
                    `${format(new Date(event.start), "PPP p")}`,
                  ]
                    .filter(Boolean)
                    .join("\n")
                }
                messages={{
                  showMore: (count) => `+${count} more`,
                }}
                components={{
                  toolbar: (props) => (
                    <CalendarToolbar
                      label={props.label}
                      view={props.view}
                      views={views}
                      onView={props.onView}
                      onNavigate={(a) => props.onNavigate(a)}
                      search={search}
                      onSearch={setSearch}
                    />
                  ),
                  event: ({ event }) => <EventChip event={event} />,
                  month: {
                    dateHeader: DateHeader,
                  },
                }}
                style={{ height: "clamp(580px, 72vh, 860px)" }}
                className="rbc-modern font-sans"
              />
            )}
          </div>
        </div>
      )}

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
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
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
        <div className="h-9 w-48 rounded-full bg-muted/60" />
        <div className="h-9 w-56 rounded-full bg-muted/60" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  filter,
  searching,
}: {
  filter: FilterKey;
  searching: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 px-6">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold">
        {searching
          ? "No events match your search"
          : filter === "all"
            ? "No events scheduled"
            : filter === "meeting"
              ? "No meetings yet"
              : filter === "task"
                ? "No tasks yet"
                : "No events for this filter"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {searching
          ? "Try a different keyword, or clear the search to see everything."
          : "Once events are scheduled they'll appear here, colour-coded by type."}
      </p>
    </div>
  );
}

// ─── CSS overrides (scoped to .rbc-modern) ────────────────────────────────────
// Designed to make react-big-calendar feel native to the app: lighter grid
// lines, larger date cells, soft today background, polished `+N more` chip,
// hover lift on events, and dark-mode contrast.

const rbcOverrides = `
  /* Outer frame */
  .rbc-modern .rbc-month-view,
  .rbc-modern .rbc-time-view,
  .rbc-modern .rbc-agenda-view {
    border: 1px solid hsl(var(--border) / 0.6);
    border-radius: 20px;
    overflow: hidden;
    background: hsl(var(--card));
    box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  }

  /* Weekday header strip */
  .rbc-modern .rbc-month-header,
  .rbc-modern .rbc-time-header {
    background: hsl(var(--muted) / 0.35);
    backdrop-filter: blur(4px);
  }
  .rbc-modern .rbc-header {
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    padding: 12px 8px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: hsl(var(--muted-foreground));
  }
  .rbc-modern .rbc-header + .rbc-header {
    border-left: 1px solid hsl(var(--border) / 0.4);
  }

  /* Cell separators — lighter and more spacious */
  .rbc-modern .rbc-month-row + .rbc-month-row {
    border-top: 1px solid hsl(var(--border) / 0.4);
  }
  .rbc-modern .rbc-day-bg + .rbc-day-bg {
    border-left: 1px solid hsl(var(--border) / 0.4);
  }
  .rbc-modern .rbc-month-row {
    overflow: visible;
    min-height: 110px;
  }

  /* Date cell — wrap so the custom header animates on hover */
  .rbc-modern .rbc-date-cell {
    padding: 8px 10px 4px;
    text-align: right;
  }
  .rbc-modern .rbc-row-bg .rbc-day-bg {
    transition: background-color 150ms ease;
  }
  .rbc-modern .rbc-row-bg .rbc-day-bg:hover {
    background-color: hsl(var(--muted) / 0.5);
  }

  /* Off-range (greyed) cells — softer than default */
  .rbc-modern .rbc-off-range-bg {
    background-color: hsl(var(--muted) / 0.25);
  }
  .rbc-modern .rbc-off-range {
    color: hsl(var(--muted-foreground) / 0.45);
  }

  /* Today cell — gentle wash, not the harsh yellow default */
  .rbc-modern .rbc-today {
    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.04));
  }

  /* Events — full pill, hover lift */
  .rbc-modern .rbc-event {
    border: none !important;
    font-size: 11.5px !important;
    margin: 1px 4px;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .rbc-modern .rbc-event:focus,
  .rbc-modern .rbc-event:focus-visible {
    outline: 2px solid rgb(99 102 241 / 0.55);
    outline-offset: 1px;
  }
  .rbc-modern .rbc-event:hover {
    transform: translateY(-1px);
    box-shadow:
      0 8px 18px -6px rgba(15,23,42,0.22),
      inset 0 1px 0 rgba(255,255,255,0.24);
  }
  .rbc-modern .rbc-event-content {
    line-height: 1.1;
  }

  /* "+N more" — turn into a styled badge */
  .rbc-modern .rbc-show-more {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    font-weight: 700;
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 999px;
    margin: 2px 4px;
    border: 1px solid hsl(var(--border) / 0.7);
    transition: background-color 150ms ease, transform 150ms ease;
  }
  .rbc-modern .rbc-show-more:hover {
    background: hsl(var(--muted) / 0.75);
    transform: translateY(-1px);
    color: rgb(79 70 229);
  }

  /* Popup that shows when "+N more" is clicked */
  .rbc-modern .rbc-overlay {
    border-radius: 14px;
    border: 1px solid hsl(var(--border));
    box-shadow: 0 16px 40px -8px rgba(15,23,42,0.25);
    background: hsl(var(--card));
    padding: 10px;
  }
  .rbc-modern .rbc-overlay-header {
    border-bottom: 1px solid hsl(var(--border) / 0.6);
    margin: -10px -10px 8px;
    padding: 10px 12px;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  /* Agenda view rows */
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table {
    border: 1px solid hsl(var(--border) / 0.6);
    border-radius: 14px;
    overflow: hidden;
  }
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr > td,
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
    padding: 12px 14px;
    font-size: 12.5px;
    border-color: hsl(var(--border) / 0.5);
  }
  .rbc-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
    background: hsl(var(--muted) / 0.4);
  }

  /* Time view */
  .rbc-modern .rbc-time-content,
  .rbc-modern .rbc-time-header-content,
  .rbc-modern .rbc-time-gutter,
  .rbc-modern .rbc-timeslot-group {
    border-color: hsl(var(--border) / 0.45);
  }
  .rbc-modern .rbc-time-slot {
    color: hsl(var(--muted-foreground));
    font-size: 10.5px;
  }
  .rbc-modern .rbc-current-time-indicator {
    background-color: rgb(99 102 241);
    height: 2px;
  }

  /* Group cell-hover affordance with our DateHeader (quick-add button) */
  .rbc-modern .rbc-date-cell {
    position: relative;
  }
  .rbc-modern .rbc-day-bg {
    position: relative;
  }
  .rbc-modern .rbc-row .rbc-date-cell { display: flex; justify-content: flex-end; }

  /* Dark mode adjustments */
  .dark .rbc-modern .rbc-today {
    background: linear-gradient(135deg, rgba(99,102,241,0.20), rgba(59,130,246,0.10));
  }
  .dark .rbc-modern .rbc-off-range-bg {
    background-color: hsl(var(--muted) / 0.35);
  }
  .dark .rbc-modern .rbc-show-more {
    background: hsl(var(--muted) / 0.5);
  }
`;
