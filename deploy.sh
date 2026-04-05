#!/bin/bash
set -e

echo "🧹 캐시 삭제..."
rm -rf .next .vercel node_modules/.cache

echo "🔨 클린 빌드..."
npx @cloudflare/next-on-pages

echo "🚀 Cloudflare Pages 배포..."
npx wrangler pages deploy .vercel/output/static --project-name=lemma --commit-dirty=true

echo "✅ 배포 완료!"
