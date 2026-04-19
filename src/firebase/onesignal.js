/**
 * OneSignal Push Notification Utilities
 *
 * Handles initialization, user identification, and sending push notifications
 * via the OneSignal REST API (client-side, acceptable for college projects).
 *
 * Uses the react-onesignal npm package instead of the CDN approach for
 * more reliable initialization in React/Vite apps.
 */

import OneSignal from 'react-onesignal'

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY

let initialized = false
let initFailed = false

/**
 * Initialize OneSignal SDK via the npm package.
 * Should be called once when the app mounts.
 */
export async function initOneSignal() {
  if (initialized || initFailed || !APP_ID) return
  if (typeof window === 'undefined') return

  try {
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: '/sw.js',
      notifyButton: {
        enable: false,
      },
      promptOptions: {
        slidedown: {
          prompts: [],
        },
      },
    })
    initialized = true
    console.log('OneSignal SDK initialized successfully')
  } catch (error) {
    initFailed = true
    console.warn('OneSignal init failed:', error.message || error)
  }
}

/**
 * Log in a user to OneSignal with their Firebase UID.
 * @param {string} uid - Firebase user UID
 */
export async function loginOneSignal(uid) {
  if (!APP_ID || !uid || !initialized) return

  try {
    await OneSignal.login(uid)
    console.log('OneSignal user logged in:', uid)
  } catch (error) {
    console.warn('OneSignal login error:', error.message)
  }
}

/**
 * Log out the current user from OneSignal.
 */
export async function logoutOneSignal() {
  if (!initialized) return

  try {
    await OneSignal.logout()
    console.log('OneSignal user logged out')
  } catch (error) {
    console.warn('OneSignal logout error:', error.message)
  }
}

/**
 * Tag the current user with their role.
 * Used to segment push targets (e.g., only send to students).
 *
 * @param {string} role - 'user' | 'employee' | 'admin'
 */
export async function tagUserRole(role) {
  if (!role || !initialized) return

  try {
    await OneSignal.User.addTag('role', role)
    console.log('OneSignal user tagged with role:', role)
  } catch (error) {
    console.warn('OneSignal tag error:', error.message)
  }
}

/**
 * Prompt the user for push notification permission via OneSignal.
 * Uses the native browser permission dialog only (no slidedown).
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function promptForPush() {
  if (!initialized) {
    console.warn('OneSignal not ready — cannot request push permission')
    return false
  }

  try {
    const alreadyGranted = OneSignal.Notifications.permission
    if (alreadyGranted) {
      console.log('OneSignal: push permission already granted')
      return true
    }

    await OneSignal.Notifications.requestPermission()
    const granted = OneSignal.Notifications.permission
    console.log('OneSignal: push permission result:', granted)
    return granted
  } catch (error) {
    console.warn('OneSignal prompt error:', error.message)
    return false
  }
}

/**
 * Get the current OneSignal push permission state.
 * @returns {boolean}
 */
export function getOneSignalPermission() {
  if (!initialized) return false

  try {
    return OneSignal.Notifications.permission
  } catch (error) {
    console.warn('OneSignal permission check error:', error.message)
    return false
  }
}

/**
 * Send a push notification to all subscribed student users.
 * Calls the OneSignal REST API directly from the client.
 *
 * Uses tag filters to target only users with role='user' (students).
 *
 * @param {string} title - Notification heading
 * @param {string} message - Notification body
 * @param {string} [url='/dashboard'] - URL to open when notification is clicked
 */
export async function sendPushToStudents(title, message, url = '/dashboard') {
  if (!APP_ID || !REST_API_KEY) {
    console.warn('OneSignal credentials not configured, skipping push')
    return
  }

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: APP_ID,
        // Target only users tagged with role=user (students)
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'user' }
        ],
        headings: { en: title },
        contents: { en: message },
        url: `https://refound-3b932.web.app${url}`,
        chrome_web_icon: '/icons/icon-192x192.png',
        chrome_web_badge: '/icons/icon-72x72.png',
      }),
    })

    const data = await response.json()

    if (data.errors) {
      console.warn('OneSignal push errors:', data.errors)
    } else {
      console.log('OneSignal push sent to', data.recipients || 0, 'students')
    }

    return data
  } catch (error) {
    console.error('Failed to send OneSignal push:', error)
  }
}
