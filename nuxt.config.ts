import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const appManifestAliasPath = (() => {
  const nuxtGenerated = fileURLToPath(new URL('./.nuxt/manifest/meta/dev.json', import.meta.url))
  if (existsSync(nuxtGenerated)) return nuxtGenerated
  return fileURLToPath(new URL('./app-manifest.dev.json', import.meta.url))
})()

export default defineNuxtConfig({
  compatibilityDate: '2026-01-31',
  devtools: { enabled: true },
  typescript: { strict: true },
  css: ["~/assets/css/theme.css"],
  vite:
    process.env.NODE_ENV !== "production"
      ? {
          resolve: {
            alias: {
              '#app-manifest': appManifestAliasPath,
            },
          },
        }
      : undefined,
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
  },
});
