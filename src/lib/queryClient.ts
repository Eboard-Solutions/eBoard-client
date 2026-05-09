// main.tsx or src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 5,  // data stays fresh 5 min — no refetch on nav
      gcTime:             1000 * 60 * 10, // keep in memory 10 min
      retry:              1,              // fail fast instead of 3 retries
      refetchOnWindowFocus: false,        // stop refetching when you switch tabs
    },
  },
});