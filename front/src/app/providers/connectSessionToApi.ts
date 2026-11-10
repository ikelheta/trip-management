import { clearSession, readAccessToken } from '../../features/authentication/index.ts'
import { configureHttpClient } from '../../shared/services/httpClient.ts'
import { queryClient } from './queryClient.ts'

/** Every request carries the stored token; a session 401 signs the user out. Call once before rendering. */
export function connectSessionToApi(): void {
  configureHttpClient({
    getToken: readAccessToken,
    onUnauthorized: () => {
      clearSession()
      queryClient.clear()
    },
  })
}
