import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToUserNotifications, markNotificationRead, markAllNotificationsRead } from '../firebase/firestore'
import { getNotificationPermissionState } from '../firebase/messaging'
import { promptForPush, getOneSignalPermission } from '../firebase/onesignal'
import DashboardLayout from '../components/DashboardLayout'
import { useToast } from '../components/Toast'
import './NotificationsScreen.css'

const typeConfig = {
  claim_update: { icon: '✅', accent: '#047857', bg: '#d1fae5' },
  new_item: { icon: '🔍', accent: '#1d4ed8', bg: '#dbeafe' },
  claim_rejected: { icon: '❌', accent: '#b91c1c', bg: '#fee2e2' },
  promotion_update: { icon: '⬆️', accent: '#7c3aed', bg: '#ede9fe' },
  system: { icon: 'ℹ️', accent: '#6366f1', bg: '#e0e7ff' },
}

function NotificationsScreen() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushPermission, setPushPermission] = useState('checking') // start as 'checking' to avoid flash
  const [requestingPush, setRequestingPush] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const unsub = subscribeToUserNotifications(currentUser.uid, (data) => {
      setNotifications(data)
      setLoading(false)
    })
    return unsub
  }, [currentUser])

  // Check push notification permission state
  useEffect(() => {
    // First check the browser's native permission
    const browserPerm = getNotificationPermissionState()

    if (browserPerm === 'denied') {
      setPushPermission('denied')
      return
    }

    if (browserPerm === 'granted') {
      // Browser says granted — verify with OneSignal too
      const osGranted = getOneSignalPermission()
      setPushPermission(osGranted ? 'granted' : 'default')
    } else {
      // Browser permission is 'default' — show the enable banner
      setPushPermission('default')
    }
  }, [])

  const handleEnablePush = useCallback(async () => {
    setRequestingPush(true)
    try {
      console.log('Requesting push permission via OneSignal...')
      const granted = await promptForPush()
      console.log('Push permission result:', granted)
      if (granted) {
        setPushPermission('granted')
        showToast('Push notifications enabled!', 'success')
      } else {
        const currentPerm = getNotificationPermissionState()
        setPushPermission(currentPerm)
        if (currentPerm === 'denied') {
          showToast('Notifications blocked. Enable them in your browser settings.', 'error')
        } else {
          showToast('Push notifications were not enabled. Please try again.', 'warning')
        }
      }
    } catch (err) {
      console.error('Push permission error:', err)
      showToast('Failed to enable notifications', 'error')
    } finally {
      setRequestingPush(false)
    }
  }, [showToast])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(currentUser.uid)
  }

  const handleMarkAsRead = async (id) => {
    await markNotificationRead(id)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DashboardLayout pageTitle="Notifications">
      {/* Push notification banner */}
      {pushPermission === 'default' && (
        <div className="push-banner" id="push-notification-banner">
          <div className="push-banner-content">
            <div className="push-banner-icon">🔔</div>
            <div className="push-banner-text">
              <h4>Enable Push Notifications</h4>
              <p>Get instant alerts when someone finds your lost item or your claim gets updated.</p>
            </div>
          </div>
          <button
            id="enable-push-btn"
            className="push-banner-btn"
            onClick={handleEnablePush}
            disabled={requestingPush}
          >
            {requestingPush ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      )}

      {pushPermission === 'denied' && (
        <div className="push-banner push-banner-denied" id="push-denied-banner">
          <div className="push-banner-content">
            <div className="push-banner-icon">🚫</div>
            <div className="push-banner-text">
              <h4>Notifications Blocked</h4>
              <p>You've blocked notifications. To enable them, go to your browser settings → Site Settings → Notifications.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="notif-header">
        <span className="notif-count">
          {loading ? '' : unreadCount > 0 ? `${unreadCount} new` : 'All caught up 🎉'}
        </span>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="dash-empty">
            <span className="dash-empty-icon">🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = typeConfig[n.type] || typeConfig.system
            return (
              <div
                className={`notif-card ${n.isRead ? '' : 'unread'}`}
                key={n.id}
                onClick={() => handleMarkAsRead(n.id)}
              >
                <div className="notif-icon" style={{ background: config.bg }}>
                  <span>{config.icon}</span>
                </div>
                <div className="notif-body">
                  <div className="notif-top">
                    <h3 className="notif-title">{n.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Notification'}</h3>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className="notif-message">{n.message}</p>
                </div>
                {!n.isRead && <div className="notif-dot" />}
              </div>
            )
          })
        )}
      </div>
    </DashboardLayout>
  )
}

export default NotificationsScreen
