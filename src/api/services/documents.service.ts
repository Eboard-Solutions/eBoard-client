// src/api/services/documents.service.ts
// Documents API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  Document,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentFilters,
  BulkDeleteData,
  PaginatedResponse,
} from '@/types/api.types';

export const documentsService = {
  /**
   * Get all documents with pagination and filters
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<PaginatedResponse<Document>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Document>>>(
      ENDPOINTS.DOCUMENTS.BASE,
      { params: filters }
    );
    const data = response.data.data;
    // Handle both array and paginated responses
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(data.length / (filters.limit || 10)),
      };
    }
    return data;
  },

  /**
   * Get document by ID
   */
  async getDocumentById(id: string): Promise<Document> {
    const response = await apiClient.get<ApiResponse<Document>>(
      ENDPOINTS.DOCUMENTS.BY_ID(id)
    );
    return response.data.data;
  },

  /**
   * Create/upload a new document
   */
  async createDocument(data: CreateDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.folderId) formData.append('folderId', data.folderId);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.accessLevel) formData.append('accessLevel', data.accessLevel);
    if (data.meetingId) formData.append('meetingId', data.meetingId);

    const response = await apiClient.post<ApiResponse<Document>>(
      ENDPOINTS.DOCUMENTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * Update document metadata or file
   */
  async updateDocument(id: string, data: UpdateDocumentData): Promise<Document> {
    let payload: FormData | Record<string, unknown>;
    const headers: Record<string, string> = {};

    if (data.file) {
      payload = new FormData();
      payload.append('file', data.file);
      if (data.title) payload.append('title', data.title);
      if (data.description) payload.append('description', data.description);
      if (data.folderId) payload.append('folderId', data.folderId);
      if (data.tags) payload.append('tags', JSON.stringify(data.tags));
      if (data.accessLevel) payload.append('accessLevel', data.accessLevel);
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      payload = { ...data };
      delete (payload as Record<string, unknown>).file;
    }

    const response = await apiClient.patch<ApiResponse<Document>>(
      ENDPOINTS.DOCUMENTS.UPDATE(id),
      payload,
      { headers }
    );
    return response.data.data;
  },

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.DOCUMENTS.DELETE(id));
  },

  /**
   * Bulk delete documents
   */
  async bulkDeleteDocuments(data: BulkDeleteData): Promise<void> {
    await apiClient.post(ENDPOINTS.DOCUMENTS.BULK_DELETE, data);
  },
};

export default documentsService;
