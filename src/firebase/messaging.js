import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import app from './config'
import { db } from './config'

const messaging = getMessaging(app)

/**
 * Request notification permission and get the FCM token.
 * Stores the token in Firestore so the backend can target this device.
 *
 * @param {string} uid - The authenticated user's UID
 * @returns {string|null} The FCM token, or null if permission denied
 */
export async function requestNotificationPermission(uid) {
  try {
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY is not set in .env')
      return null
    }

    const token = await getToken(messaging, { vapidKey })

    if (token && uid) {
      // Store the token in the user's Firestore document
      await updateDoc(doc(db, 'users', uid), {
        fcmTokens: arrayUnion(token)
      })
      console.log('FCM token saved to Firestore')
    }

    return token
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

/**
 * Listen for foreground messages.
 * Call this once when the app mounts. Returns an unsubscribe function.
 *
 * @param {function} callback - Called with the payload when a message arrives
 * @returns {function} Unsubscribe function
 */
export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload)
    callback(payload)
  })
}

/**
 * Get the current notification permission state.
 * @returns {'granted'|'denied'|'default'} The permission state
 */
export function getNotificationPermissionState() {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}
