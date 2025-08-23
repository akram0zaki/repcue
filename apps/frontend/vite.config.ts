import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg', 'splash/**/*', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'splash/*.{png,svg}', 'manifest.json'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /^\/splash\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'splash-screens-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Phase 3 T-3.2: runtime caching for exercise demo videos
          {
            urlPattern: /^\/videos\/.*\.(mp4|webm|mov)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'exercise-videos-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      // Use our custom manifest instead of generating one
      manifest: {
        name: 'RepCue - Fitness Timer',
        short_name: 'RepCue',
        description: 'Privacy-first fitness tracking app for interval training, optimized for mobile devices',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['health', 'fitness', 'lifestyle'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: '/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png'
          },
          {
            src: '/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Start Timer',
            short_name: 'Timer',
            description: 'Start exercise timer',
            url: '/timer',
            icons: [
              {
                src: '/android-chrome-192x192.png',
                sizes: '192x192'
              }
            ]
          },
          {
            name: 'Browse Exercises',
            short_name: 'Exercises',
            description: 'Browse available exercises',
            url: '/exercises',
            icons: [
              {
                src: '/android-chrome-192x192.png',
                sizes: '192x192'
              }
            ]
          }
        ]
      },
      useCredentials: true
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better loading
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['./src/utils/platformDetection', './src/services/storageService'],
          components: ['./src/components/Navigation', './src/components/AppShell']
        }
      }
    },
    assetsInlineLimit: 0 // Ensure all assets are copied as files
  },
  publicDir: 'public' // Ensure public directory is properly copied
})
