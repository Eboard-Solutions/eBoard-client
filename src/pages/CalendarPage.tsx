import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { startOfWeek } from "date-fns";
import { parse } from "date-fns/parse";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calendarService,
  CALENDAR_QUERY_KEYS,
} from "../api/services/calendar.service";

import "react-big-calendar/lib/css/react-big-calendar.css";
import type { CalendarEvent } from "@/types/api.types";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendaPage() {
  const [, setLocation] = useLocation();

  //--Controlled calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  const {
    data: events,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: CALENDAR_QUERY_KEYS.all,
    queryFn: calendarService.getEvents,
  });

  const views = useMemo(() => ["month", "week", "day", "agenda"] as View[], []);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad";
    if (event.type === "meeting") backgroundColor = "#4f46e5"; // Indigo
    if (event.type === "task") backgroundColor = "#10b981"; // Emerald

    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    // Navigate via wouter to the event URL
    setLocation(event.url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header matching your existing UI patterns */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-linear-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <CalendarIcon
              className="h-6 w-6 text-white drop-shadow-sm"
              strokeWidth={2.25}
            />
            <span className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3l font-bold text-gray-900 dark:text-white tracking-tight truncate">
              Organisation Calendar
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 truncate">
              View all scheduled meetings, tasks, and action items.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md shadow flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Failed to load calendar events.</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow ring-1 ring-black/5 h-175">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <Calendar<CalendarEvent>
              localizer={localizer}
              events={events || []}
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
              className="font-sans dark:text-gray-200"
            />
          )}
        </div>
      )}
    </div>
  );
}
