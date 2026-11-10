import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../../shared/services/httpClient.ts'

const MAX_RETRIES = 2
const STALE_TIME_MS = 30_000

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx answer will not change on retry.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false, retry: shouldRetry },
    mutations: { retry: false },
  },
})
