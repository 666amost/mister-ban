import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const appManifestAliasPath = (() => {
  const nuxtGenerated = fileURLToPath(new URL('./.nuxt/manifest/meta/dev.json', import.meta.url))
  if (existsSync(nuxtGenerated)) return nuxtGenerated
  return fileURLToPath(new URL('./app-manifest.dev.json', import.meta.url))
})()

export default defineNuxtConfig({
  compatibilityDate: '2026-01-31',
  ssr: true,
  devtools: { enabled: true },
  // A single dual-stack listener serves localhost and 127.0.0.1.
  devServer: { host: '::', port: 3000 },
  typescript: { strict: true },
  css: ["~/assets/css/theme.css", "~/assets/css/public.css"],
  
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48 64x64 128x128 256x256' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48.png', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
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
    public: {
      siteUrl: "https://www.misterban.com",
      siteIndexable: process.env.VERCEL_ENV !== "preview",
    },
  },
});
