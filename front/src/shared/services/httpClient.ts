import { API_BASE_URL } from '../../config/env.ts'
import type { ApiErrorBody } from '../types/api.ts'

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  /** Sent as multipart/form-data (file upload). */
  formData?: FormData
  /** Empty, null and undefined values are left out. */
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

interface HttpClientHooks {
  getToken: () => string | null
  onUnauthorized: () => void
}

/** An API error response, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join('\n'))
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }
}

const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check your connection and try again.'

// Only these 401 messages mean the session is gone; other 401s (wrong password) are form errors.
const SESSION_ERROR_MESSAGES = ['Missing access token', 'Invalid or expired access token']

let hooks: HttpClientHooks = {
  getToken: () => null,
  onUnauthorized: () => {},
}

/** Called once at start-up (authentication story) so requests carry the token. */
export function configureHttpClient(next: HttpClientHooks): void {
  hooks = next
}

/** JSON request. Resolves with the parsed body, or undefined for 204. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/** Binary download (files need the token, so <img src> cannot load them directly). */
export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await send(path, { signal })
  return response.blob()
}

/** Turns a url returned by the API ("/api/files/<id>/download") into a path for apiRequest / apiBlob. */
export function toApiPath(url: string): string {
  return url.startsWith('/api/') ? url.slice('/api'.length) : url
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers()
  const token = hooks.getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, [NETWORK_ERROR_MESSAGE])
  }

  if (response.ok) {
    return response
  }
  const error = await toApiError(response)
  if (
    error.status === 401 &&
    token &&
    error.messages.some((message) => SESSION_ERROR_MESSAGES.includes(message))
  ) {
    hooks.onUnauthorized()
  }
  throw error
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    params.set(key, String(value))
  }
  const search = params.toString()
  return `${API_BASE_URL}${path}${search ? `?${search}` : ''}`
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null
  const message = body?.message ?? (response.statusText || 'Request failed')
  return new ApiError(response.status, Array.isArray(message) ? message : [message])
}
