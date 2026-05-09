// src/api/services/documents.service.ts
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Document,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentFilters,
  BulkDeleteData,
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

function normaliseError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    const axiosMessage = (error as any).response?.data?.message;
    if (axiosMessage) return new Error(axiosMessage);
    return error;
  }
  return new Error(fallback);
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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

export const documentsService = {
  /**
   * FIX: was returning response.data.data (the unwrapped array) which made
   * the return type lie — the hook declared ResponseObject<Document[]> but
   * actually received Document[]. The page then called .items on that array
   * and always got undefined → empty list.
   *
   * Now returns the full ResponseObject so the shape matches the declared
   * type and the page can safely read .data from it.
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<ResponseObject<Document[]>> {
    try {
      const response = await apiClient.get<ResponseObject<Document[]>>(
        ENDPOINTS.DOCUMENTS.BASE,
        { params: filters }
      );
      return response.data; // ← return the full wrapper, not .data.data
    } catch (error) {
      throw normaliseError(error, 'Failed to fetch documents. Please check your connection.');
    }
  },

  async getDocumentById(id: string): Promise<ResponseObject<Document>> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    try {
      const response = await apiClient.get<ResponseObject<Document>>(
        ENDPOINTS.DOCUMENTS.BY_ID(id)
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error, `Failed to fetch document (ID: ${id}).`);
    }
  },

  async createDocument(
    data: CreateDocumentData,
    onProgress?: (percent: number) => void,
  ): Promise<ResponseObject<Document>> {
    if (!data.file) throw new Error('A file is required to upload a document.');
    if (!data.title?.trim()) throw new Error('Document title is required.');
    validateFile(data.file);

    try {
      const documentMetadata: Record<string, unknown> = {
        title: data.title.trim(),
        fileName: data.file.name,
        fileType: data.file.type,
        fileSize: data.file.size,
        uploadedBy: 'pending',
        accessLevel: data.accessLevel ?? 'VIEWER',
      };

      if (data.description?.trim()) documentMetadata.description = data.description.trim();
      if (data.folderId) documentMetadata.folderId = data.folderId;
      if (Array.isArray(data.tags) && data.tags.length > 0) documentMetadata.tags = data.tags;
      if (data.meetingId) documentMetadata.meetingId = data.meetingId;

      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('document', JSON.stringify(documentMetadata));

      // 90s timeout for uploads — global is 30s, but a 10 MB file on a slow
      // connection legitimately needs more. Browsers will still abort if the
      // socket actually dies. onUploadProgress streams percent back so the
      // dialog can show a real progress bar instead of an indefinite spinner.
      const response = await apiClient.post<ResponseObject<Document>>(
        ENDPOINTS.DOCUMENTS.CREATE,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90_000,
          onUploadProgress: (e) => {
            if (!onProgress) return;
            const total = e.total ?? data.file?.size ?? 0;
            if (!total) return;
            const pct = Math.min(100, Math.round((e.loaded / total) * 100));
            onProgress(pct);
          },
        },
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error, 'Failed to upload document. Please try again.');
    }
  },

  async updateDocument(id: string, data: UpdateDocumentData): Promise<ResponseObject<Document>> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error('Document title cannot be empty.');
    }
    if (data.file) {
      validateFile(data.file);
    }

    try {
      if (data.file) {
        const documentMetadata: Record<string, unknown> = {};
        if (data.title?.trim()) documentMetadata.title = data.title.trim();
        if (data.description?.trim()) documentMetadata.description = data.description.trim();
        if (data.folderId) documentMetadata.folderId = data.folderId;
        if (Array.isArray(data.tags)) documentMetadata.tags = data.tags;
        if (data.accessLevel) documentMetadata.accessLevel = data.accessLevel;

        const fd = new FormData();
        fd.append('file', data.file);
        fd.append('document', JSON.stringify(documentMetadata));

        const response = await apiClient.patch<ResponseObject<Document>>(
          ENDPOINTS.DOCUMENTS.UPDATE(id),
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
      } else {
        const { file: _file, ...rest } = data as any;
        const response = await apiClient.patch<ResponseObject<Document>>(
          ENDPOINTS.DOCUMENTS.UPDATE(id),
          rest
        );
        return response.data;
      }
    } catch (error) {
      throw normaliseError(error, `Failed to update document. Please try again.`);
    }
  },

  async deleteDocument(id: string): Promise<ResponseObject<Document>> {
    if (!id?.trim()) throw new Error('Document ID is required.');
    try {
      const response = await apiClient.delete<ResponseObject<Document>>(
        ENDPOINTS.DOCUMENTS.DELETE(id)
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error, 'Failed to delete document. Please try again.');
    }
  },

  async bulkDeleteDocuments(data: BulkDeleteData): Promise<ResponseObject<Document[]>> {
    if (!Array.isArray(data.ids) || data.ids.length === 0) {
      throw new Error('At least one document ID is required for bulk delete.');
    }
    try {
      const response = await apiClient.post<ResponseObject<Document[]>>(
        ENDPOINTS.DOCUMENTS.BULK_DELETE,
        data
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error, 'Bulk delete failed. Some documents may not have been removed.');
    }
  },
};

export default documentsService;