import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchFileBlob } from '../services/fileService.ts'

const FILE_CACHE_TIME_MS = 5 * 60 * 1000

export const filesKeys = {
  all: ['files'] as const,
  blob: (url: string) => [...filesKeys.all, 'blob', url] as const,
}

export interface FileObjectUrl {
  objectUrl: string | null
  isLoading: boolean
  error: unknown
}

/**
 * Loads a protected file with the token and exposes it as an object URL for <img src>.
 * The blob is cached per url (files never change: a new upload gets a new url).
 */
export function useFileObjectUrl(url: string | null): FileObjectUrl {
  const query = useQuery({
    queryKey: filesKeys.blob(url ?? ''),
    queryFn: ({ signal }) => fetchFileBlob(url ?? '', signal),
    enabled: url !== null,
    staleTime: Infinity,
    gcTime: FILE_CACHE_TIME_MS,
  })
  const [current, setCurrent] = useState<{ blob: Blob; objectUrl: string } | null>(null)

  // Object URLs are a browser resource: create one per blob and revoke it when the blob
  // changes or the component unmounts (an effect is the right tool for this sync).
  useEffect(() => {
    if (!query.data) {
      return
    }
    const blob = query.data
    const created = URL.createObjectURL(blob)
    // The url comes from the browser resource created above; it cannot be derived during render.
    // oxlint-disable-next-line react/set-state-in-effect
    setCurrent({ blob, objectUrl: created })
    return () => URL.revokeObjectURL(created)
  }, [query.data])

  // Only the url made from the current blob; an older one is already revoked.
  const objectUrl = current && current.blob === query.data ? current.objectUrl : null

  return { objectUrl, isLoading: query.isLoading, error: query.error }
}
