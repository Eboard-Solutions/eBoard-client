// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Optional: nice devtool panel at the bottom of the screen
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from './App.tsx';
import './index.css'; // or your global styles

// Create a client (do this once)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Adjust defaults to your preference
      staleTime: 1000 * 60,       // 1 minute
      gcTime: 1000 * 60 * 5,      // 5 minutes (formerly cacheTime)
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Optional — remove in production or set initialIsOpen={false} */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);