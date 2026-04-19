import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import App from './App'
import './index.css'

// ── PWA Service Worker Registration ──
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  // When a new SW is ready, just apply it immediately without prompting.
  // Using confirm() causes reload loops on some mobile browsers.
  onNeedRefresh() {
    console.log('New version available — auto-updating...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('ReFound is ready to work offline!')
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates every 4 hours (not every hour — too frequent causes loops on mobile)
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 4 * 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('SW registration failed:', error)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
