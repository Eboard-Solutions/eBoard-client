// src/api/services/compliance.service.ts
// Compliance / Governance API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { ComplianceItem } from '@/features/board-member/types';
import type { ResponseObject } from '@/api/response-object.ts';

export const complianceService = {
  async getAll(): Promise<ResponseObject<ComplianceItem[]>> {
    const response = await apiClient.get<ResponseObject<ComplianceItem[]>>(ENDPOINTS.COMPLIANCE.BASE);
    return response.data;
  },

  async acknowledge(id: string): Promise<ResponseObject<ComplianceItem>> {
    const response = await apiClient.post<ResponseObject<ComplianceItem>>(ENDPOINTS.COMPLIANCE.ACKNOWLEDGE(id));
    return response.data;
  },
};

export default complianceService;