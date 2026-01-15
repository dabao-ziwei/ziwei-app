import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      
      // [新增] workbox 設定：調高快取檔案大小限制
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 設定為 4MB (預設是 2MB)
      },

      manifest: {
        name: '大寶紫微斗數',
        short_name: '大寶紫微',
        description: 'AI 智能紫微斗數命理分析系統',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})