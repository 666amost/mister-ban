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
  // A single dual-stack listener serves localhost and 127.0.0.1.
  devServer: { host: '::', port: 3000 },
  typescript: { strict: true },
  css: ["~/assets/css/theme.css", "~/assets/css/public.css"],
  
  app: {
    pageTransition: { name: 'page', mode: 'in-out' },
    layoutTransition: { name: 'layout', mode: 'in-out' },
  },

  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: true,
    viewTransition: true,
  },

  nitro: {
    preset: 'vercel',
    minify: true,
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
  },

  vite:
    process.env.NODE_ENV !== "production"
      ? {
          resolve: {
            alias: {
              '#app-manifest': appManifestAliasPath,
            },
          },
        }
      : {
          build: {
            cssCodeSplit: true,
            minify: 'esbuild',
            rollupOptions: {
              output: {
                manualChunks: {
                  'vendor': ['vue', '@vue/runtime-dom'],
                },
              },
            },
          },
          resolve: {
            alias: {
              '#app-manifest': appManifestAliasPath,
            },
          },
        },
  
  runtimeConfig: {
    databaseUrl: "",
  },
});
