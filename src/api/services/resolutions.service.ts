import type { Resolution, Vote } from '@/features/board-member';

import apiClient from '../client';
import type { ResponseObject } from '../response-object';
import { ENDPOINTS } from '@/config/api.config';
export interface CreateResolutionData {
    title: string;
    description?: string;
    meetingId?: string;
    votingDeadline?: string;
}
export interface UpdateResolutionData extends Partial<CreateResolutionData> {
    status?: Resolution['status'];
}

export interface CastVoteData {
    resolutionId: string;
    vote: Vote['vote'];
}

export const resolutionsService = {
    async getAll(): Promise<ResponseObject<Resolution[]>> {
        try {
            const response = await apiClient.get<ResponseObject<Resolution[]>>(ENDPOINTS.RESOLUTIONS.BASE);
            return response.data;
        } catch (err) {
            // If the backend doesn't expose resolutions yet (404), return an empty successful wrapper
            return new ResponseObject<Resolution[]>(404, 'Not found', []);
        }
    },

    async getById(id: string): Promise<ResponseObject<Resolution>> {
        const response = await apiClient.get<ResponseObject<Resolution>>(ENDPOINTS.RESOLUTIONS.BY_ID(id));
        return response.data;
    },

    async create(data: CreateResolutionData): Promise<ResponseObject<Resolution>> {
        const response = await apiClient.post<ResponseObject<Resolution>>(ENDPOINTS.RESOLUTIONS.CREATE, data);
        return response.data;
    },

    async update(id: string, data: UpdateResolutionData): Promise<ResponseObject<Resolution>> {
        const response = await apiClient.patch<ResponseObject<Resolution>>(ENDPOINTS.RESOLUTIONS.UPDATE(id), data);
        return response.data;
    },

    async delete(id: string): Promise<ResponseObject<void>> {
        const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.RESOLUTIONS.DELETE(id));
        return response.data;
    },

    async castVote(data: CastVoteData): Promise<ResponseObject<Resolution>> {
        const response = await apiClient.post<ResponseObject<Resolution>>(ENDPOINTS.RESOLUTIONS.VOTE, data);
        return response.data;
    },
};

export default resolutionsService;