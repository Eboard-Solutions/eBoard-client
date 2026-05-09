// src/hooks/api/useOverview.ts
// React Query hooks for Overview/Analytics API

import { useQuery } from '@tanstack/react-query';
import OverviewService from '@/api/services/overview.service';

// Query keys
export const overviewKeys = {
  all: ['overview'] as const,
  analytics: () => [...overviewKeys.all, 'analytics'] as const,
  finance: () => [...overviewKeys.all, 'finance'] as const,
};

// Real-time refresh policy shared by every dashboard summary query.
// Polls in the foreground only — pauses while the tab is hidden so we don't
// waste battery / quota when the user isn't looking at the dashboard.
const REALTIME = {
  staleTime: 60 * 1000,
  refetchInterval: 90 * 1000,            // 90s — analytics aggregates are heavier
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

// Get analytics data
export function useAnalytics() {
  return useQuery({
    queryKey: overviewKeys.analytics(),
    queryFn: () => OverviewService.getAnalytics(),
    ...REALTIME,
  });
}

// Get finance overview
export function useFinanceOverview() {
  return useQuery({
    queryKey: overviewKeys.finance(),
    queryFn: () => OverviewService.getFinance(),
    ...REALTIME,
  });
}

// Get dashboard summary (alias for analytics)
export function useDashboardSummary() {
  return useQuery({
    queryKey: overviewKeys.analytics(),
    queryFn: () => OverviewService.getAnalytics(),
    ...REALTIME,
  });
}
