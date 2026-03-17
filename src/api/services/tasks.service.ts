// src/api/services/tasks.service.ts
import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}

export const TasksService = {
  async getAll(filters?: TaskFilters): Promise<ResponseObject<Task[]>> {
    const response = await apiClient.get<ResponseObject<Task[]>>(ENDPOINTS.TASKS.BASE, { params: filters });
    return response.data;
  },

  async getById(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.get<ResponseObject<Task>>(ENDPOINTS.TASKS.BY_ID(id));
    return response.data;
  },

  async create(data: CreateTaskData): Promise<ResponseObject<Task>> {
    // Required by DTO: title, assigneeId, dueDate (number)
    // Optional (backend defaults): status → TODO, priority → MEDIUM
    // Excluded: createdBy → set by backend from JWT
    const payload: Record<string, unknown> = {
      title:      data.title.trim(),
      assigneeId: data.assigneeId,
      dueDate:    Number(data.dueDate),
    };

    if (data.status)              payload.status      = data.status;
    if (data.priority)            payload.priority    = data.priority;
    if (data.description?.trim()) payload.description = data.description.trim();
    if (data.meetingId)           payload.meetingId   = data.meetingId;

    const response = await apiClient.post<ResponseObject<Task>>(ENDPOINTS.TASKS.CREATE, payload);
    return response.data;
  },

  async update(id: string, data: UpdateTaskData): Promise<ResponseObject<Task>> {
    const payload = stripEmpty(data as Record<string, unknown>);
    if (payload.dueDate !== undefined) payload.dueDate = Number(payload.dueDate);
    const response = await apiClient.patch<ResponseObject<Task>>(ENDPOINTS.TASKS.UPDATE(id), payload);
    return response.data;
  },

  async complete(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.patch<ResponseObject<Task>>(ENDPOINTS.TASKS.UPDATE(id), {
      status:      'COMPLETED',
      completedAt: Date.now(),
    });
    return response.data;
  },

  async delete(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.delete<ResponseObject<Task>>(ENDPOINTS.TASKS.DELETE(id));
    return response.data;
  },

  async bulkDelete(ids: string[]): Promise<ResponseObject<Task[]>> {
    const response = await apiClient.post<ResponseObject<Task[]>>(ENDPOINTS.TASKS.BULK_DELETE, { ids });
    return response.data;
  },
};

export default TasksService;