import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

/**
 * Custom Vite plugin: injects Firebase env vars into the service worker.
 *
 * Service workers in /public can't use import.meta.env (they run outside Vite's
 * module pipeline). This plugin replaces __FIREBASE_*__ placeholders with actual
 * values from .env at both dev-serve and production-build time.
 */
function firebaseSWEnvPlugin() {
  let env = {}

  function injectEnv(content) {
    return content
      .replace('__FIREBASE_API_KEY__', env.VITE_FIREBASE_API_KEY || '')
      .replace('__FIREBASE_AUTH_DOMAIN__', env.VITE_FIREBASE_AUTH_DOMAIN || '')
      .replace('__FIREBASE_PROJECT_ID__', env.VITE_FIREBASE_PROJECT_ID || '')
      .replace('__FIREBASE_STORAGE_BUCKET__', env.VITE_FIREBASE_STORAGE_BUCKET || '')
      .replace('__FIREBASE_MESSAGING_SENDER_ID__', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
      .replace('__FIREBASE_APP_ID__', env.VITE_FIREBASE_APP_ID || '')
  }

  return {
    name: 'firebase-sw-env',

    // Capture env vars from .env files
    config(_, { mode }) {
      env = loadEnv(mode, process.cwd(), 'VITE_')
    },

    // Dev: intercept the SW request and serve with env vars injected
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/firebase-messaging-sw.js') {
          const filePath = path.resolve('public/firebase-messaging-sw.js')
          let content = fs.readFileSync(filePath, 'utf-8')
          content = injectEnv(content)
          res.setHeader('Content-Type', 'application/javascript')
          res.end(content)
          return
        }
        next()
      })
    },

    // Build: replace placeholders in the copied output file
    writeBundle: {
      sequential: true,
      handler(options) {
        const outDir = options.dir
        const swPath = path.resolve(outDir, 'firebase-messaging-sw.js')
        if (fs.existsSync(swPath)) {
          let content = fs.readFileSync(swPath, 'utf-8')
          content = injectEnv(content)
          fs.writeFileSync(swPath, content)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    firebaseSWEnvPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'ReFound - Bringing Things Back',
        short_name: 'ReFound',
        description: 'A Lost and Found application that helps you recover your lost belongings.',
        theme_color: '#1a1a2e',
        background_color: '#fdf8f4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['utilities', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Pre-cache app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Google Fonts webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cloudinary images
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Firebase API calls — network first so data is fresh
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in dev mode for testing
      }
    })
  ],
})
