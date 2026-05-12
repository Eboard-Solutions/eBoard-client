import apiClient from '../client';
import type { RawCalendarEvent, CalendarEvent } from '../../types/api.types';
import { ENDPOINTS } from '@/config/api.config';
import {ResponseObject} from '../response-object';

export const CALENDAR_QUERY_KEYS = {
    all: ['calendarEvents'] as const,
};

/**
 * Defensive unwrapper standard used across eBoard-client
 * Handles ResponseObject `.data`, legacy `.items`, double-wrapped responses, and bare arrays.
 */
function unwrapArray<T>(raw: unknown): T[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as T[];
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as T[];
    if (Array.isArray(r.items)) return r.items as T[];
    const inner = r.data as { data?: unknown; items?: unknown } | undefined;
    if (inner && Array.isArray(inner.data)) return inner.data as T[];
    if (inner && Array.isArray(inner.items)) return inner.items as T[];
    return [];
}

export const calendarService = {
    getEvents: async (): Promise<CalendarEvent[]> => {
        const response = await apiClient.get<ResponseObject<RawCalendarEvent[]>>(ENDPOINTS.CALENDAR.BASE);
        const rawEvents = unwrapArray<RawCalendarEvent>(response.data);

        
        return rawEvents
            .filter((event) => {
                if (!event.start || !event.end) return false;

                const startDate = new Date(event.start);
                const endDate = new Date(event.end);

                return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());
            })
            .map((event) => ({
                ...event,
                
                start: new Date(event.start),
                end: new Date(event.end),
            }));
    },
}