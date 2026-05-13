import { resolutionsService, type CastVoteData, type CreateResolutionData, type UpdateResolutionData } from "@/api/services/resolutions.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";



export const resolutionKeys = {
    all: ['resolutions'] as const,
    lists: () => [...resolutionKeys.all, 'list'] as const,
    list: () => [...resolutionKeys.lists()] as const,
    details: () => [...resolutionKeys.all, 'detail'] as const,
    detail: (id: string) => [...resolutionKeys.details(), id] as const,
};

export function useResolutions() {
    return useQuery({
        queryKey: resolutionKeys.list(),
        queryFn: () => resolutionsService.getAll(),
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
        refetchOnWindowFocus: true,
    });
}

export function useResolutionById(id: string) {
    return useQuery({
        queryKey: resolutionKeys.detail(id),
        queryFn: () => resolutionsService.getById(id),
        enabled: !!id,
    })
}
export function useCreateResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResolutionData) => resolutionsService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: resolutionKeys.all }),
  });
}

export function useUpdateResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResolutionData }) =>
      resolutionsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: resolutionKeys.all }),
  });
}

export function useDeleteResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolutionsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: resolutionKeys.all }),
  });
}

export function useCastResolutionVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CastVoteData) => resolutionsService.castVote(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: resolutionKeys.all }),
  });
}