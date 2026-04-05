/**
 * R2 does not support signed URLs natively in Workers.
 * Return a proxy path that streams the file via /api/file/[...key].
 */
export function getPhotoUrl(key: string): string {
  return `/api/file/${key}`
}
