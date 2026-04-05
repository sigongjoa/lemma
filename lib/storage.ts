import { getR2 } from './db'

export async function uploadSubmissionPhoto(
  submissionId: string,
  file: File,
  index: number
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `submissions/${submissionId}/${index}.${ext}`

  const r2 = getR2()
  const buffer = await file.arrayBuffer()
  await r2.put(key, buffer, { httpMetadata: { contentType: file.type } })

  return key
}

/**
 * R2 does not support signed URLs natively in Workers.
 * Return a proxy path that streams the file via /api/file/[...key].
 */
export function getPhotoUrl(key: string): string {
  return `/api/file/${key}`
}
