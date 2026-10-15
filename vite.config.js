import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'بازی‌های شاد',
        short_name: 'بازی‌های شاد',
        description: 'بازی‌های کودکانه، بدون نیاز به باز کردن لینک',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#1a2744',
        theme_color: '#1a2744',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
