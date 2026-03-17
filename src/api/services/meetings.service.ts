// src/api/services/meetings.service.ts
// Meetings API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Meeting,
  CreateMeetingData,
  UpdateMeetingData,
  AddAttendeesData,
  RSVPData,
  MeetingAttendee,
  MeetingAttendeeStats,
  PaginationParams,
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export interface FetchMeetingsParams extends PaginationParams {
  status?: string;
}

export const meetingsService = {
  /**
   * Get all meetings with pagination
   */
  async getMeetings(params: FetchMeetingsParams = { page: 1, limit: 10 }) {
    const response = await apiClient.get<ResponseObject<Meeting[]>>(
        ENDPOINTS.MEETINGS.BASE,
        { params }
    );
    return {
      items: response.data.data,
      total: response.data.totalRecords,
      page: params.page || 1,
      limit: params.limit || 10,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * Get user's meetings
   */
  async getMyMeetings(includeDeclined: boolean = false) {
    const response = await apiClient.get<ResponseObject<Meeting[]>>(
        ENDPOINTS.MEETINGS.MY_MEETINGS,
        { params: { includeDeclined } }
    );
    return {
      items: response.data.data,
      total: response.data.totalRecords,
      page: response.data.currentPage,
      limit: 10,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.get<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.BY_ID(meetingId)
    );
    return response.data;
  },

  /**
   * Create a new meeting
   */
  async createMeeting(data: CreateMeetingData): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.post<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.BASE,
        data
    );
    return response.data;
  },

  /**
   * Update meeting
   */
  async updateMeeting(meetingId: string, data: UpdateMeetingData): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.patch<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.BY_ID(meetingId),
        data
    );
    return response.data;
  },

  /**
   * Delete meeting
   */
  async deleteMeeting(meetingId: string): Promise<ResponseObject<void>> {
    const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.MEETINGS.BY_ID(meetingId));
    return response.data;
  },

  /**
   * Add attendees to meeting
   */
  async addAttendees(meetingId: string, data: AddAttendeesData): Promise<ResponseObject<void>> {
    const response = await apiClient.post<ResponseObject<void>>(ENDPOINTS.MEETINGS.ADD_ATTENDEE(meetingId), data);
    return response.data;
  },

  /**
   * Remove attendee from meeting
   */
  async removeAttendee(meetingId: string, userId: string): Promise<ResponseObject<void>> {
    const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.MEETINGS.REMOVE_ATTENDEE(meetingId, userId));
    return response.data;
  },

  /**
   * Get meeting attendees
   */
  async getAttendees(meetingId: string): Promise<ResponseObject<MeetingAttendee[]>> {
    const response = await apiClient.get<ResponseObject<MeetingAttendee[]>>(
        ENDPOINTS.MEETINGS.ATTENDEES(meetingId)
    );
    return response.data;
  },

  /**
   * Get attendee statistics
   */
  async getAttendeeStats(meetingId: string): Promise<ResponseObject<MeetingAttendeeStats>> {
    const response = await apiClient.get<ResponseObject<MeetingAttendeeStats>>(
        ENDPOINTS.MEETINGS.ATTENDEE_STATS(meetingId)
    );
    return response.data;
  },

  /**
   * RSVP to meeting
   */
  async rsvp(meetingId: string, data: RSVPData): Promise<ResponseObject<void>> {
    const response = await apiClient.patch<ResponseObject<void>>(ENDPOINTS.MEETINGS.RSVP(meetingId), data);
    return response.data;
  },

  /**
   * Start meeting
   */
  async startMeeting(meetingId: string): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.post<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.START(meetingId)
    );
    return response.data;
  },

  /**
   * Complete meeting
   */
  async completeMeeting(meetingId: string): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.post<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.COMPLETE(meetingId)
    );
    return response.data;
  },

  /**
   * Cancel meeting
   */
  async cancelMeeting(meetingId: string): Promise<ResponseObject<Meeting>> {
    const response = await apiClient.post<ResponseObject<Meeting>>(
        ENDPOINTS.MEETINGS.CANCEL(meetingId)
    );
    return response.data;
  },
};

export default meetingsService;