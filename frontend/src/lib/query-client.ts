import { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient | null = null;

/** Singleton QueryClient safe for Next.js App Router */
export const getQueryClient = (): QueryClient => {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 300_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }

  // Client: reuse singleton
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 300_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }

  return queryClient;
};
