import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// [PWA] 引入 PWA 註冊器
import { registerSW } from 'virtual:pwa-register'

// [PWA] 註冊 Service Worker (自動更新機制)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('有新版本可用，是否重新整理更新？')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)