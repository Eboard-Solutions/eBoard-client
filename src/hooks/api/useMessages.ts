// src/hooks/api/useMessages.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import messagesService from '@/api/services/messages.service';
import type { CreateThreadData, SendMessageData } from '@/api/services/messages.service';

export const messageKeys = {
  all: ['messages'] as const,
  threads: () => [...messageKeys.all, 'threads'] as const,
  thread: (id: string) => [...messageKeys.all, 'thread', id] as const,
};

export function useMessageThreads() {
  return useQuery({
    queryKey: messageKeys.threads(),
    queryFn: () => messagesService.getThreads(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMessageThread(id: string) {
  return useQuery({
    queryKey: messageKeys.thread(id),
    queryFn: () => messagesService.getThread(id),
    enabled: !!id,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateThreadData) => messagesService.createThread(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.threads() }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageData) => messagesService.sendMessage(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(vars.threadId) });
      qc.invalidateQueries({ queryKey: messageKeys.threads() });
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => messagesService.markThreadRead(threadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.threads() }),
  });
}