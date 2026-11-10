const STORAGE_KEY = 'trip-management.session'
const MS_PER_SECOND = 1000

interface StoredSession {
  accessToken: string
  /** Epoch milliseconds. */
  expiresAt: number
}

const listeners = new Set<() => void>()

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const session = JSON.parse(raw) as Partial<StoredSession>
    if (typeof session.accessToken !== 'string' || typeof session.expiresAt !== 'number') {
      return null
    }
    return { accessToken: session.accessToken, expiresAt: session.expiresAt }
  } catch {
    return null
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** The stored token, or null when there is none or it has expired. A string, so it is a stable snapshot. */
export function readAccessToken(): string | null {
  const session = readSession()
  return session && session.expiresAt > Date.now() ? session.accessToken : null
}

export function readExpiresAt(): number | null {
  return readSession()?.expiresAt ?? null
}

export function saveSession(accessToken: string, expiresInSeconds: number): void {
  const session: StoredSession = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * MS_PER_SECOND,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  notify()
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  notify()
}

/** For useSyncExternalStore. Also follows sign-in / sign-out in other tabs. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
