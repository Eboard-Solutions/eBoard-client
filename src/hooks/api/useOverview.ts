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

// Get analytics data
export function useAnalytics() {
  return useQuery({
    queryKey: overviewKeys.analytics(),
    queryFn: () => OverviewService.getAnalytics(),
  });
}

// Get finance overview
export function useFinanceOverview() {
  return useQuery({
    queryKey: overviewKeys.finance(),
    queryFn: () => OverviewService.getFinance(),
  });
}

// Get dashboard summary (alias for analytics)
export function useDashboardSummary() {
  return useQuery({
    queryKey: overviewKeys.analytics(),
    queryFn: () => OverviewService.getAnalytics(),
  });
}
