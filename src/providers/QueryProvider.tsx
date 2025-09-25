'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache time: data stays in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus only if data is stale
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect automatically
            refetchOnReconnect: 'always',
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Show error for 5 seconds
            gcTime: 5000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
