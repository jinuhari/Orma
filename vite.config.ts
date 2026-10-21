import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __ORMA_BUILD__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Custom schemes (the desktop app) cannot host service workers.
      injectRegister: false,
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png', 'brand/*.webp'],
      manifest: {
        id: '/',
        name: 'Orma',
        short_name: 'Orma',
        description: 'Life planning app for Career, Money, Health, and Family.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // The classic map must not be frozen in the precache. Existing installs were
        // serving that old copy even after a hosting deploy.
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js', '**/legacy/**'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ['sw-clients.js'],
        // Installers and the classic map page are plain files, not SPA routes.
        navigateFallbackDenylist: [/^\/downloads\//, /^\/legacy\//, /^\/__\//],
        runtimeCaching: [
          {
            urlPattern: /\/legacy\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'orma-legacy',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'orma-third-party' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'relay/**/*.test.ts'],
  },
})
