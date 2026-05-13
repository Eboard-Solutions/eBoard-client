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
    const response = await apiClient.get<ResponseObject<Task[]>>(
      ENDPOINTS.TASKS.BASE, { params: filters, timeout: 20_000 }
    );
    return response.data;
  },

  async getById(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.get<ResponseObject<Task>>(
      ENDPOINTS.TASKS.BY_ID(id), { timeout: 15_000 }
    );
    return response.data;
  },

  // Mutations get a generous 60s ceiling. The default 30s was tripping
  // because task writes fan out to notifications + cache invalidation on
  // the backend; the save itself succeeds but the response misses the
  // axios deadline, surfacing as a misleading "timeout of 30000ms exceeded"
  // even though the row was already updated in the DB.
  async create(data: CreateTaskData): Promise<ResponseObject<Task>> {
    const payload: Record<string, unknown> = {
      title:      data.title.trim(),
      assigneeId: data.assigneeId,
      dueDate:    Number(data.dueDate),
    };

    if (data.status)              payload.status      = data.status;
    if (data.priority)            payload.priority    = data.priority;
    if (data.description?.trim()) payload.description = data.description.trim();
    if (data.meetingId)           payload.meetingId   = data.meetingId;

    const response = await apiClient.post<ResponseObject<Task>>(
      ENDPOINTS.TASKS.CREATE, payload, { timeout: 60_000 }
    );
    return response.data;
  },

  async update(id: string, data: UpdateTaskData): Promise<ResponseObject<Task>> {
    const payload = stripEmpty(data as Record<string, unknown>);
    if (payload.dueDate !== undefined) payload.dueDate = Number(payload.dueDate);
    const response = await apiClient.patch<ResponseObject<Task>>(
      ENDPOINTS.TASKS.UPDATE(id), payload, { timeout: 60_000 }
    );
    return response.data;
  },

  async complete(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.patch<ResponseObject<Task>>(
      ENDPOINTS.TASKS.UPDATE(id),
      { status: 'COMPLETED', completedAt: Date.now() },
      { timeout: 60_000 },
    );
    return response.data;
  },

  async delete(id: string): Promise<ResponseObject<Task>> {
    const response = await apiClient.delete<ResponseObject<Task>>(
      ENDPOINTS.TASKS.DELETE(id), { timeout: 30_000 }
    );
    return response.data;
  },

  async bulkDelete(ids: string[]): Promise<ResponseObject<Task[]>> {
    const response = await apiClient.post<ResponseObject<Task[]>>(
      ENDPOINTS.TASKS.BULK_DELETE, { ids }, { timeout: 60_000 }
    );
    return response.data;
  },
};

export default TasksService;