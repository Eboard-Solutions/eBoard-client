// src/hooks/api/useCompliance.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import complianceService from '@/api/services/compliance.service';

export const complianceKeys = {
  all: ['compliance'] as const,
  list: () => [...complianceKeys.all, 'list'] as const,
};

export function useCompliance() {
  return useQuery({
    queryKey: complianceKeys.list(),
    queryFn: () => complianceService.getAll(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAcknowledgeCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceService.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.all }),
  });
}