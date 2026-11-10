/** backend/contracts/files.md `FileMetadata`. */
export interface FileMetadata {
  id: string
  ownerType: string
  ownerId: string | null
  originalName: string
  /** Internal to the backend; do not use. */
  storageKey: string
  mimeType: string
  sizeBytes: number
  checksum: string
  /** "/api/files/<id>/download" — send it in other modules' bodies; load it with useFileObjectUrl. */
  url: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
