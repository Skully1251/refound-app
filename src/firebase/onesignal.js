/**
 * OneSignal Push Notification Utilities
 *
 * Uses the OneSignal Web SDK v16 loaded directly via <script> tag in index.html.
 * The react-onesignal npm wrapper had a bug where requestPermission() threw
 * "TypeError: t is not a function", so we bypass it entirely.
 *
 * Also handles sending push notifications via the OneSignal REST API
 * (client-side, acceptable for college projects).
 */

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY

let initialized = false
let initPromise = null

/**
 * Get a reference to the global OneSignal object.
 * Returns null if the SDK hasn't loaded yet.
 */
function getOS() {
  return typeof window !== 'undefined' ? window.OneSignal : null
}

/**
 * Wait for the OneSignal SDK script to load (it's loaded with defer).
 * Polls every 100ms for up to 10 seconds.
 */
function waitForSDK() {
  return new Promise((resolve) => {
    // Already available
    if (window.OneSignal) {
      resolve(window.OneSignal)
      return
    }

    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (window.OneSignal) {
        clearInterval(interval)
        resolve(window.OneSignal)
      } else if (attempts > 100) {
        // 10 seconds timeout
        clearInterval(interval)
        resolve(null)
      }
    }, 100)
  })
}

/**
 * Initialize OneSignal SDK.
 * Waits for the SDK script to load, then calls init() directly.
 * Safe to call multiple times — only initializes once.
 */
export async function initOneSignal() {
  if (initialized) return
  if (initPromise) return initPromise
  if (!APP_ID || typeof window === 'undefined') return

  initPromise = (async () => {
    try {
      const OS = await waitForSDK()
      if (!OS) {
        console.warn('OneSignal SDK failed to load')
        return
      }

      await OS.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: true,
        // Use the Workbox-generated SW which imports OneSignal's push handler
        // via importScripts in vite.config.js. This ensures ONE SW handles
        // both caching and push notifications.
        serviceWorkerPath: '/sw.js',
        notifyButton: { enable: false },
      })
      initialized = true
      console.log('OneSignal SDK initialized successfully')
    } catch (error) {
      console.warn('OneSignal init failed:', error.message || error)
    }
  })()

  return initPromise
}

/**
 * Log in a user to OneSignal with their Firebase UID.
 * @param {string} uid - Firebase user UID
 */
export async function loginOneSignal(uid) {
  if (!APP_ID || !uid) return

  // Ensure OneSignal is initialized before logging in
  if (!initialized) await initOneSignal()
  if (!initialized) return

  try {
    const OS = getOS()
    if (OS) {
      // Clear any stale identity first to avoid 409 Conflict errors
      try {
        await OS.logout()
      } catch (_) {
        // Ignore logout errors — there may be no user logged in
      }
      await OS.login(uid)
      console.log('OneSignal user logged in:', uid)
    }
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
    const OS = getOS()
    if (OS) {
      await OS.logout()
      console.log('OneSignal user logged out')
    }
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
  if (!role) return

  // Ensure OneSignal is initialized before tagging
  if (!initialized) await initOneSignal()
  if (!initialized) return

  try {
    const OS = getOS()
    if (OS && OS.User) {
      await OS.User.addTag('role', role)
      console.log('OneSignal user tagged with role:', role)
    }
  } catch (error) {
    console.warn('OneSignal tag error:', error.message)
  }
}

/**
 * Prompt the user for push notification permission.
 * Uses the native browser permission dialog.
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function promptForPush() {
  // Ensure OneSignal is initialized before requesting permission
  if (!initialized) {
    await initOneSignal()
  }

  if (!initialized) {
    console.warn('OneSignal not ready — cannot request push permission')
    return false
  }

  try {
    const OS = getOS()
    if (!OS || !OS.Notifications) return false

    // Already granted
    if (OS.Notifications.permission) {
      console.log('OneSignal: push permission already granted')
      return true
    }

    // Request permission using the native browser dialog
    await OS.Notifications.requestPermission()
    const granted = OS.Notifications.permission
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
    const OS = getOS()
    if (OS && OS.Notifications) {
      return !!OS.Notifications.permission
    }
    return false
  } catch (error) {
    console.warn('OneSignal permission check error:', error.message)
    return false
  }
}

// ─── REST API Push Helpers ───────────────────────────────────────────

/**
 * Internal helper to send a push via the OneSignal REST API.
 * @param {Object} bodyOverrides - Fields merged into the request body (filters, include_aliases, etc.)
 * @param {string} title
 * @param {string} message
 * @param {string} url
 * @param {string} label - Human-readable target label for logging
 */
async function _sendPush(bodyOverrides, title, message, url, label) {
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
        headings: { en: title },
        contents: { en: message },
        url: `https://refound-3b932.web.app${url}`,
        chrome_web_icon: 'https://refound-3b932.web.app/icons/icon-192x192.png',
        chrome_web_badge: 'https://refound-3b932.web.app/icons/icon-72x72.png',
        ...bodyOverrides,
      }),
    })

    const data = await response.json()

    if (data.errors) {
      console.warn(`OneSignal push errors (${label}):`, data.errors)
    } else {
      console.log(`OneSignal push sent to ${data.recipients || 0} ${label}`)
    }

    return data
  } catch (error) {
    console.error(`Failed to send OneSignal push (${label}):`, error)
  }
}

/**
 * Send a push notification to all subscribed student users.
 * Uses tag filters to target only users with role='user' (students).
 */
export async function sendPushToStudents(title, message, url = '/dashboard') {
  return _sendPush(
    { filters: [{ field: 'tag', key: 'role', relation: '=', value: 'user' }] },
    title, message, url, 'students'
  )
}

/**
 * Send a push notification to all subscribed employees.
 * Uses tag filters to target only users with role='employee'.
 */
export async function sendPushToEmployees(title, message, url = '/emp/review-claims') {
  return _sendPush(
    { filters: [{ field: 'tag', key: 'role', relation: '=', value: 'employee' }] },
    title, message, url, 'employees'
  )
}

/**
 * Send a push notification to all subscribed admins.
 * Uses tag filters to target only users with role='admin'.
 */
export async function sendPushToAdmins(title, message, url = '/admin/dashboard') {
  return _sendPush(
    { filters: [{ field: 'tag', key: 'role', relation: '=', value: 'admin' }] },
    title, message, url, 'admins'
  )
}

/**
 * Send a push notification to a specific user by their Firebase UID.
 * OneSignal identifies users by the external_id set during login.
 *
 * @param {string} externalId - Firebase UID of the target user
 * @param {string} title
 * @param {string} message
 * @param {string} [url='/notifications']
 */
export async function sendPushToUser(externalId, title, message, url = '/notifications') {
  if (!externalId) return
  return _sendPush(
    {
      include_aliases: { external_id: [externalId] },
      target_channel: 'push',
    },
    title, message, url, `user:${externalId}`
  )
}
