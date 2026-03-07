// src/api/services/documents.service.ts
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

// ─── Error normaliser ──────────────────────────────────────────────────────────

/**
 * Extracts a human-readable message from any API / network error.
 */
function normaliseError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    // Axios wraps the response on error.response
    const axiosMessage = (error as any).response?.data?.message;
    if (axiosMessage) return new Error(axiosMessage);
    return error;
  }
  return new Error(fallback);
}

// ─── Validators ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      'Unsupported file type. Please upload a PDF, Word, Excel, or PowerPoint file.'
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const documentsService = {
  /**
   * Fetch documents with optional filters and pagination.
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<PaginatedResponse<Document>> {
    try {
      const response = await apiClient.get<ApiResponse<PaginatedResponse<Document>>>(
        ENDPOINTS.DOCUMENTS.BASE,
        { params: filters }
      );
      return response.data.data;
    } catch (error) {
      throw normaliseError(error, 'Failed to fetch documents. Please check your connection.');
    }
  },

  /**
   * Fetch a single document by ID.
   */
  async getDocumentById(id: string): Promise<Document> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    try {
      const response = await apiClient.get<ApiResponse<Document>>(
        ENDPOINTS.DOCUMENTS.BY_ID(id)
      );
      return response.data.data;
    } catch (error) {
      throw normaliseError(error, `Failed to fetch document (ID: ${id}).`);
    }
  },

  /**
   * Upload a new document (multipart/form-data).
   */
  async createDocument(data: CreateDocumentData): Promise<Document> {
    // Client-side validation
    if (!data.file) throw new Error('A file is required to upload a document.');
    if (!data.title?.trim()) throw new Error('Document title is required.');
    validateFile(data.file);

    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title.trim());

      if (data.description?.trim()) {
        formData.append('description', data.description.trim());
      }
      if (data.folderId) {
        formData.append('folderId', data.folderId);
      }
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }
      if (data.accessLevel) {
        formData.append('accessLevel', data.accessLevel);
      }
      if (data.meetingId) {
        formData.append('meetingId', data.meetingId);
      }

      const response = await apiClient.post<ApiResponse<Document>>(
        ENDPOINTS.DOCUMENTS.CREATE,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data;
    } catch (error) {
      throw normaliseError(error, 'Failed to upload document. Please try again.');
    }
  },

  /**
   * Update document metadata and/or replace the file.
   */
  async updateDocument(id: string, data: UpdateDocumentData): Promise<Document> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error('Document title cannot be empty.');
    }
    if (data.file) {
      validateFile(data.file);
    }

    try {
      let payload: FormData | Partial<UpdateDocumentData>;
      const headers: Record<string, string> = {};

      if (data.file) {
        // Replace file → multipart
        const fd = new FormData();
        fd.append('file', data.file);
        if (data.title?.trim()) fd.append('title', data.title.trim());
        if (data.description?.trim()) fd.append('description', data.description.trim());
        if (data.folderId) fd.append('folderId', data.folderId);
        if (Array.isArray(data.tags)) fd.append('tags', JSON.stringify(data.tags));
        if (data.accessLevel) fd.append('accessLevel', data.accessLevel);
        payload = fd;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Metadata only → JSON (omit 'file' key)
        const { file: _file, ...rest } = data as any;
        payload = rest;
      }

      const response = await apiClient.patch<ApiResponse<Document>>(
        ENDPOINTS.DOCUMENTS.UPDATE(id),
        payload,
        { headers }
      );
      return response.data.data;
    } catch (error) {
      throw normaliseError(error, `Failed to update document. Please try again.`);
    }
  },

  /**
   * Permanently delete a single document.
   */
  async deleteDocument(id: string): Promise<void> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    try {
      await apiClient.delete(ENDPOINTS.DOCUMENTS.DELETE(id));
    } catch (error) {
      throw normaliseError(error, 'Failed to delete document. Please try again.');
    }
  },

  /**
   * Bulk delete multiple documents.
   */
  async bulkDeleteDocuments(data: BulkDeleteData): Promise<void> {
    if (!Array.isArray(data.ids) || data.ids.length === 0) {
      throw new Error('At least one document ID is required for bulk delete.');
    }
    try {
      await apiClient.post(ENDPOINTS.DOCUMENTS.BULK_DELETE, data);
    } catch (error) {
      throw normaliseError(error, 'Bulk delete failed. Some documents may not have been removed.');
    }
  },
};

export default documentsService;