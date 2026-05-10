// src/lib/queryClient.ts
import { QueryClient, keepPreviousData } from '@tanstack/react-query';

// Real-time-friendly defaults:
//
// - `staleTime: 30s` — within 30s of a successful fetch, a re-mount/navigation
//   uses cache; after that, TanStack triggers a background refetch on next
//   access. Lowered from 5min so dashboard counts feel current.
//
// - `refetchOnWindowFocus: true` — the second the user returns to the tab
//   the dashboard fires off all queries. Combined with per-query polling
//   intervals (60–90s), data is at most ~60s stale on screen.
//
// - `refetchOnReconnect: true` — when network comes back, re-sync.
//
// - `placeholderData: keepPreviousData` — when filters/params change OR a
//   refetch is in flight, keep the previous data on screen instead of
//   flickering back to a skeleton. This is the single biggest "feels fast"
//   win for the dashboard.
//
// - `retry: 1` — fail fast.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30 * 1000,
      gcTime:               10 * 60 * 1000,
      retry:                1,
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
      placeholderData:      keepPreviousData,
    },
  },
});