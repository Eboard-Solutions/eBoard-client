// src/api/services/overview.service.ts
// Overview/Analytics API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type { AnalyticsData, FinanceOverview } from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export const OverviewService = {
  // Get dashboard analytics
  async getAnalytics(): Promise<ResponseObject<AnalyticsData>> {
    const response = await apiClient.get<ResponseObject<AnalyticsData>>(ENDPOINTS.OVERVIEW.ANALYTICS);
    return response.data;
  },

  // Get financial overview
  async getFinance(): Promise<ResponseObject<FinanceOverview>> {
    const response = await apiClient.get<ResponseObject<FinanceOverview>>(ENDPOINTS.OVERVIEW.FINANCE);
    return response.data;
  },
};

export default OverviewService;