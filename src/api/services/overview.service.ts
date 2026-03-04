// src/api/services/overview.service.ts
// Overview/Analytics API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type { AnalyticsData, FinanceOverview } from '@/types/api.types';

export const OverviewService = {
  // Get dashboard analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await apiClient.get(ENDPOINTS.OVERVIEW.ANALYTICS);
    return response.data.data || response.data;
  },

  // Get financial overview
  async getFinance(): Promise<FinanceOverview> {
    const response = await apiClient.get(ENDPOINTS.OVERVIEW.FINANCE);
    return response.data.data || response.data;
  },
};

export default OverviewService;
