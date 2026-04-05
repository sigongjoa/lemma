import { getRequestContext } from '@cloudflare/next-on-pages'

export function getDB(): D1Database {
  return getRequestContext().env.DB
}

export function getR2(): R2Bucket {
  return getRequestContext().env.R2
}

// Helper: run a SELECT and return rows
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getDB()
  const result = await db.prepare(sql).bind(...params).all<T>()
  return result.results
}

// Helper: run INSERT/UPDATE/DELETE
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<D1Result> {
  const db = getDB()
  return db.prepare(sql).bind(...params).run()
}

// Helper: get single row
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const db = getDB()
  const result = await db.prepare(sql).bind(...params).first<T>()
  return result ?? null
}
