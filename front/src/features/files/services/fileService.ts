import { apiBlob, apiRequest, toApiPath } from '../../../shared/services/httpClient.ts'
import type { FileMetadata } from '../types/files.ts'

/** Upload-first: no ownerId; the owning module links the file when its record is saved. */
export function uploadFile(file: File, ownerType: string): Promise<FileMetadata> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('ownerType', ownerType)
  return apiRequest<FileMetadata>('/files', { method: 'POST', formData })
}

/** The bytes behind a url returned by the API ("/api/files/<id>/download"). */
export function fetchFileBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  return apiBlob(toApiPath(url), signal)
}
