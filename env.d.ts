interface CloudflareEnv {
  DB: D1Database
  R2: R2Bucket
  NEXTAUTH_SECRET: string
  GEMINI_API_KEY: string
  Z3_SERVICE_URL?: string
}
