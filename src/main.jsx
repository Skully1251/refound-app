import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import App from './App'
import './index.css'

// ── PWA Service Worker Registration ──
import { registerSW } from 'virtual:pwa-register'

registerSW({
  // With registerType: 'prompt', the new SW installs and waits silently.
  // We intentionally do NOT reload the page — updates apply on next visit.
  onNeedRefresh() {
    console.log('New app version available — will apply on next visit.')
  },
  onOfflineReady() {
    console.log('ReFound is ready to work offline!')
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates every 4 hours
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
