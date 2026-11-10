export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_MB = 10

const BYTES_PER_MB = 1024 * 1024

/** Why a file cannot be uploaded as an image; the text is in `filesMessages.upload`. */
export type ImageFileProblem = 'wrongType' | 'empty' | 'tooLarge'

/** The problem when the file cannot be an uploaded image, otherwise null. */
export function validateImageFile(file: File): ImageFileProblem | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return 'wrongType'
  }
  if (file.size === 0) {
    return 'empty'
  }
  if (file.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
    return 'tooLarge'
  }
  return null
}
