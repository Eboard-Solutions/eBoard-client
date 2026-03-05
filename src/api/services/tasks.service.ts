// src/api/services/tasks.service.ts
// Tasks API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  PaginatedResponse,
} from '@/types/api.types';

export const TasksService = {
  // Get all tasks with pagination
  async getAll(filters?: TaskFilters): Promise<PaginatedResponse<Task>> {
    const response = await apiClient.get(ENDPOINTS.TASKS.BASE, { params: filters });
    return response.data.data || response.data;
  },

  // Get task by ID
  async getById(id: string): Promise<Task> {
    const response = await apiClient.get(ENDPOINTS.TASKS.BY_ID(id));
    return response.data.data || response.data;
  },

  // Create task
  async create(data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post(ENDPOINTS.TASKS.CREATE, data);
    return response.data.data || response.data;
  },

  // Update task
  async update(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await apiClient.patch(ENDPOINTS.TASKS.UPDATE(id), data);
    return response.data.data || response.data;
  },

  // Complete task
  async complete(id: string): Promise<Task> {
    const response = await apiClient.patch(ENDPOINTS.TASKS.UPDATE(id), {
      status: 'COMPLETED',
      completedAt: Date.now(),
    });
    return response.data.data || response.data;
  },

  // Delete task
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.TASKS.DELETE(id));
  },

  // Bulk delete tasks
  async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post(ENDPOINTS.TASKS.BULK_DELETE, { ids });
  },
};

export default TasksService;
