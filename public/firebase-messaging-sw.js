// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications even when the app is closed.
// NOTE: importScripts is the only way to load dependencies in a service worker context.
// NOTE: The __FIREBASE_*__ placeholders are replaced at build time by the Vite plugin
//       defined in vite.config.js. Do NOT hardcode credentials here.

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js')

// Firebase config — injected at build time from environment variables
firebase.initializeApp({
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__'
})

const messaging = firebase.messaging()

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload)

  const { title, body, icon, image } = payload.notification || {}
  const notificationTitle = title || 'ReFound'
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: icon || '/icons/icon-192x192.png',
    image: image || undefined,
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: payload.collapseKey || 'refound-notification',
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If there's already a tab open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(urlToOpen)
    })
  )
})
