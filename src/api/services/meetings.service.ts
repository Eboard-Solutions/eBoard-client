// src/api/services/meetings.service.ts
// Meetings API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  Meeting,
  CreateMeetingData,
  UpdateMeetingData,
  AddAttendeesData,
  RSVPData,
  MeetingAttendee,
  MeetingAttendeeStats,
  PaginatedResponse,
  PaginationParams,
} from '@/types/api.types';

export interface FetchMeetingsParams extends PaginationParams {
  status?: string;
}

export const meetingsService = {
  /**
   * Get all meetings with pagination
   */
  async getMeetings(params: FetchMeetingsParams = { page: 1, limit: 10 }): Promise<PaginatedResponse<Meeting>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Meeting>>>(
      ENDPOINTS.MEETINGS.BASE,
      { params }
    );
    // Handle different response formats
    const data = response.data.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: Math.ceil(data.length / (params.limit || 10)),
      };
    }
    return data;
  },

  /**
   * Get user's meetings
   */
  async getMyMeetings(includeDeclined: boolean = false): Promise<Meeting[]> {
    const response = await apiClient.get<ApiResponse<Meeting[]>>(
      ENDPOINTS.MEETINGS.MY_MEETINGS,
      { params: { includeDeclined } }
    );
    return response.data.data || [];
  },

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<Meeting> {
    const response = await apiClient.get<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.BY_ID(meetingId)
    );
    return response.data.data;
  },

  /**
   * Create a new meeting
   */
  async createMeeting(data: CreateMeetingData): Promise<Meeting> {
    const response = await apiClient.post<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.BASE,
      data
    );
    return response.data.data;
  },

  /**
   * Update meeting
   */
  async updateMeeting(meetingId: string, data: UpdateMeetingData): Promise<Meeting> {
    const response = await apiClient.patch<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.BY_ID(meetingId),
      data
    );
    return response.data.data;
  },

  /**
   * Delete meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.MEETINGS.BY_ID(meetingId));
  },

  /**
   * Add attendees to meeting
   */
  async addAttendees(meetingId: string, data: AddAttendeesData): Promise<void> {
    await apiClient.post(ENDPOINTS.MEETINGS.ADD_ATTENDEE(meetingId), data);
  },

  /**
   * Remove attendee from meeting
   */
  async removeAttendee(meetingId: string, userId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.MEETINGS.REMOVE_ATTENDEE(meetingId, userId));
  },

  /**
   * Get meeting attendees
   */
  async getAttendees(meetingId: string): Promise<MeetingAttendee[]> {
    const response = await apiClient.get<ApiResponse<MeetingAttendee[]>>(
      ENDPOINTS.MEETINGS.ATTENDEES(meetingId)
    );
    return response.data.data || [];
  },

  /**
   * Get attendee statistics
   */
  async getAttendeeStats(meetingId: string): Promise<MeetingAttendeeStats> {
    const response = await apiClient.get<ApiResponse<MeetingAttendeeStats>>(
      ENDPOINTS.MEETINGS.ATTENDEE_STATS(meetingId)
    );
    return response.data.data;
  },

  /**
   * RSVP to meeting
   */
  async rsvp(meetingId: string, data: RSVPData): Promise<void> {
    await apiClient.patch(ENDPOINTS.MEETINGS.RSVP(meetingId), data);
  },

  /**
   * Start meeting
   */
  async startMeeting(meetingId: string): Promise<Meeting> {
    const response = await apiClient.post<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.START(meetingId)
    );
    return response.data.data;
  },

  /**
   * Complete meeting
   */
  async completeMeeting(meetingId: string): Promise<Meeting> {
    const response = await apiClient.post<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.COMPLETE(meetingId)
    );
    return response.data.data;
  },

  /**
   * Cancel meeting
   */
  async cancelMeeting(meetingId: string): Promise<Meeting> {
    const response = await apiClient.post<ApiResponse<Meeting>>(
      ENDPOINTS.MEETINGS.CANCEL(meetingId)
    );
    return response.data.data;
  },
};

export default meetingsService;
