import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logOut } from '../firebase/auth'
import { updateUserProfile, createPromotionRequest, hasPendingPromotion } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import DashboardLayout from '../components/DashboardLayout'
import './SettingsScreen.css'

function SettingsScreen() {
  const navigate = useNavigate()
  const { currentUser, userProfile, isAdmin, isEmployee } = useAuth()
  const toast = useToast()

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('refound-theme') === 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      darkMode ? 'dark' : 'light'
    )
    localStorage.setItem('refound-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')

  // Save feedback
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.name || '')
      setEmail(userProfile.email || '')
      setBio(userProfile.bio || '')
      // Load notification preferences from DB
      if (userProfile.notifPrefs) {
        setNotifCategory(userProfile.notifPrefs.category ?? true)
        setNotifLocation(userProfile.notifPrefs.location ?? true)
        setNotifClaimStatus(userProfile.notifPrefs.claimStatus ?? true)
        setNotifEmail(userProfile.notifPrefs.email ?? false)
      }
    }
  }, [userProfile])

  // Notification prefs
  const [notifCategory, setNotifCategory] = useState(true)
  const [notifLocation, setNotifLocation] = useState(true)
  const [notifClaimStatus, setNotifClaimStatus] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)

  // Promotion
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [promotionPending, setPromotionPending] = useState(false)
  const [promotionLoading, setPromotionLoading] = useState(false)

  useEffect(() => {
    if (currentUser && !isEmployee && !isAdmin) {
      hasPendingPromotion(currentUser.uid).then(setPromotionPending)
    }
  }, [currentUser, isEmployee, isAdmin])

  const handleLogout = async () => {
    await logOut()
    navigate('/')
  }

  const handleSave = async () => {
    try {
      await updateUserProfile(currentUser.uid, {
        name: displayName,
        bio,
        notifPrefs: {
          category: notifCategory,
          location: notifLocation,
          claimStatus: notifClaimStatus,
          email: notifEmail,
        }
      })
      setSaveMessage('Settings saved!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveMessage('Failed to save: ' + err.message)
      setTimeout(() => setSaveMessage(''), 4000)
    }
  }

  const handlePromotionConfirm = async () => {
    setPromotionLoading(true)
    try {
      await createPromotionRequest(
        currentUser.uid,
        userProfile?.name || currentUser.displayName || 'User',
        currentUser.email
      )
      setPromotionPending(true)
      setShowPromotionModal(false)
      toast.showSuccess('Promotion request sent to admin!')
    } catch (err) {
      toast.showError('Failed to send request: ' + err.message)
    } finally {
      setPromotionLoading(false)
    }
  }

  return (
    <DashboardLayout pageTitle="Settings">

      {/* ===== 1. Profile Settings ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">Profile Settings</h2>
        <div className="settings-card">
          {/* Avatar */}
          <div className="settings-avatar-wrapper">
            <div className="settings-avatar">
              <span>{(displayName || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <span className="settings-role-indicator">
              {userProfile?.role === 'admin' ? 'Admin' : userProfile?.role === 'employee' ? 'Employee' : 'Student'}
            </span>
          </div>

          {/* Fields */}
          <div className="settings-field">
            <label className="settings-label">Display Name</label>
            <input
              className="settings-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Email Address</label>
            <input
              className="settings-input"
              type="email"
              value={email}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Bio <span className="settings-optional">(optional)</span></label>
            <textarea
              className="settings-textarea"
              rows="3"
              placeholder="Tell us a bit about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===== 2. Request for Promotion (only for regular users) ===== */}
      {!isEmployee && !isAdmin && (
        <div className="settings-section">
          <h2 className="settings-section-title">Request for Promotion</h2>
          <div className="settings-card">
            <p className="settings-description">
              Want to become an Employee? Send a promotion request to the admin for review.
            </p>
            {promotionPending ? (
              <div className="settings-promotion-pending">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Request Pending — Awaiting admin review
              </div>
            ) : (
              <button
                className="settings-promotion-btn"
                onClick={() => setShowPromotionModal(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Request for Promotion
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== 3. Notifications ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">Notifications</h2>
        <div className="settings-card settings-card-flush">
          <div className="settings-option-row" onClick={() => setNotifCategory(!notifCategory)}>
            <div className="settings-option-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Category Alerts</span>
            </div>
            <div className={`settings-toggle ${notifCategory ? 'on' : ''}`}>
              <div className="settings-toggle-knob" />
            </div>
          </div>

          <div className="settings-option-row" onClick={() => setNotifLocation(!notifLocation)}>
            <div className="settings-option-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Item Location Updates</span>
            </div>
            <div className={`settings-toggle ${notifLocation ? 'on' : ''}`}>
              <div className="settings-toggle-knob" />
            </div>
          </div>

          <div className="settings-option-row" onClick={() => setNotifClaimStatus(!notifClaimStatus)}>
            <div className="settings-option-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Claim Status Updates</span>
            </div>
            <div className={`settings-toggle ${notifClaimStatus ? 'on' : ''}`}>
              <div className="settings-toggle-knob" />
            </div>
          </div>

          <div className="settings-option-row" onClick={() => setNotifEmail(!notifEmail)}>
            <div className="settings-option-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>Email Notifications</span>
            </div>
            <div className={`settings-toggle ${notifEmail ? 'on' : ''}`}>
              <div className="settings-toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 4. App Preferences ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">App Preferences</h2>
        <div className="settings-card settings-card-flush">
          <div className="settings-option-row" onClick={() => setDarkMode(!darkMode)}>
            <div className="settings-option-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {darkMode ? (
                  <>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                )}
              </svg>
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`settings-toggle ${darkMode ? 'on' : ''}`}>
              <div className="settings-toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 5. Help & Support ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">Help & Support</h2>
        <div className="settings-card settings-help-row">
          <button className="settings-help-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact Support
          </button>
          <button className="settings-help-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help Center
          </button>
        </div>
      </div>

      {/* ===== 6. Account Actions ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">Account Actions</h2>
        <button className="settings-signout-btn" onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* ===== Save Changes ===== */}
      <button className="settings-save-btn" onClick={handleSave}>
        Save Changes
      </button>

      {/* Save toast */}
      {saveMessage && (
        <div className={`settings-toast ${saveMessage.includes('Failed') ? 'error' : ''}`}>
          {saveMessage}
        </div>
      )}

      <p className="settings-version">ReFound v1.0.0</p>

      {/* ===== Promotion Modal ===== */}
      {showPromotionModal && (
        <div className="settings-modal-overlay" onClick={() => setShowPromotionModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
            <h3 className="settings-modal-title">Request Promotion</h3>
            <p className="settings-modal-text">
              Are you sure you want to send a promotion request to the admin? You'll be notified once it's reviewed.
            </p>
            <div className="settings-modal-actions">
              <button
                className="settings-modal-cancel"
                onClick={() => setShowPromotionModal(false)}
              >
                Cancel
              </button>
              <button
                className="settings-modal-confirm"
                onClick={handlePromotionConfirm}
                disabled={promotionLoading}
              >
                {promotionLoading ? 'Sending...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default SettingsScreen
