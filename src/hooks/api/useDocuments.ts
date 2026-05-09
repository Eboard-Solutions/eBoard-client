// src/hooks/api/useDocuments.ts
// React Query hooks for documents management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/api/services';
import type {
  CreateDocumentData,
  UpdateDocumentData,
  DocumentFilters,
  BulkDeleteData,
} from '@/types/api.types';

export const DOCUMENTS_QUERY_KEYS = {
  all: ['documents'] as const,
  lists: () => [...DOCUMENTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...DOCUMENTS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...DOCUMENTS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DOCUMENTS_QUERY_KEYS.details(), id] as const,
};

/**
 * Hook to get all documents with filters
 */
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.list(filters),
    queryFn: () => documentsService.getDocuments(filters),
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get document by ID
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.detail(id),
    queryFn: () => documentsService.getDocumentById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create/upload a new document
 */
// Variables type for the upload — supports an optional progress callback
// so the calling dialog can show a real upload progress bar.
type CreateDocumentVariables = CreateDocumentData & {
  onProgress?: (percent: number) => void;
};

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: CreateDocumentVariables) => {
      const { onProgress, ...data } = vars;
      return documentsService.createDocument(data, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to update document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentData }) =>
      documentsService.updateDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to delete document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to bulk delete documents
 */
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDeleteData) => documentsService.bulkDeleteDocuments(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEYS.all });
    },
  });
}
