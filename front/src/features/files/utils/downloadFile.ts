import { fetchFileBlob } from '../services/fileService.ts'

/** Saves a protected file (a plain <a href download> would get 401). */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  const blob = await fetchFileBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke after the click has handed the blob to the browser's download.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
