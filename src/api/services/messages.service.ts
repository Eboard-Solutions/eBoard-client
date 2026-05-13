// src/api/services/messages.service.ts
// Messages API service (threads + messaging)

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { MessageThread, Message } from '@/features/board-member/types';
import type { ResponseObject } from '@/api/response-object.ts';

export interface CreateThreadData {
  subject: string;
  participants: string[];
  initialMessage: string;
}

export interface SendMessageData {
  threadId: string;
  content: string;
}

export const messagesService = {
  async getThreads(): Promise<ResponseObject<MessageThread[]>> {
    const response = await apiClient.get<ResponseObject<MessageThread[]>>(ENDPOINTS.MESSAGES.THREADS);
    return response.data;
  },

  async getThread(id: string): Promise<ResponseObject<MessageThread>> {
    const response = await apiClient.get<ResponseObject<MessageThread>>(ENDPOINTS.MESSAGES.THREAD_BY_ID(id));
    return response.data;
  },

  async createThread(data: CreateThreadData): Promise<ResponseObject<MessageThread>> {
    const response = await apiClient.post<ResponseObject<MessageThread>>(ENDPOINTS.MESSAGES.CREATE_THREAD, data);
    return response.data;
  },

  async sendMessage(data: SendMessageData): Promise<ResponseObject<Message>> {
    const response = await apiClient.post<ResponseObject<Message>>(ENDPOINTS.MESSAGES.SEND_MESSAGE, data);
    return response.data;
  },

  async markThreadRead(threadId: string): Promise<ResponseObject<void>> {
    const response = await apiClient.post<ResponseObject<void>>(ENDPOINTS.MESSAGES.MARK_READ(threadId));
    return response.data;
  },
};

export default messagesService;