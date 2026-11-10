// Must match the global prefix in main.ts and the download route in FilesController.
const FILE_URL_PATTERN =
  /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/download$/i;

export function toFileUrl(id: string): string {
  return `/api/files/${id}/download`;
}

export function parseFileUrl(url: string): string | null {
  return FILE_URL_PATTERN.exec(url)?.[1].toLowerCase() ?? null;
}
