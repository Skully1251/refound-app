/**
 * Notification permission utilities.
 *
 * Push notifications are now handled by OneSignal (see onesignal.js).
 * This file is kept for backward compatibility with components that
 * reference the permission-state helper.
 */

/**
 * Get the current browser notification permission state.
 * @returns {'granted'|'denied'|'default'} The permission state
 */
export function getNotificationPermissionState() {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}
