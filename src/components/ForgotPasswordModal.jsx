import { useState, useEffect } from 'react'
import { resetPassword } from '../firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import './ForgotPasswordModal.css'

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1) // 1=email, 2=success
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1)
        setEmail('')
        setError('')
        setLoading(false)
      }, 300)
    }
  }, [isOpen])

  // Auto-close after success animation
  useEffect(() => {
    if (step === 2) {
      const timeout = setTimeout(() => onClose(), 3500)
      return () => clearTimeout(timeout)
    }
  }, [step, onClose])

  // ── Send Firebase reset link ──
  const handleSendReset = async () => {
    setError('')
    setLoading(true)
    try {
      // Check if email exists in Firestore
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', email.toLowerCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        setError('No account found with this email.')
        setLoading(false)
        return
      }

      // Send Firebase password reset email
      await resetPassword(email)
      setStep(2)
    } catch (err) {
      console.error('Reset error:', err)
      setError('Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fpm-overlay" onClick={step === 2 ? undefined : onClose}>
      <div className="fpm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button (hidden on success) */}
        {step !== 2 && (
          <button className="fpm-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* ═══ Step 1: Enter Email ═══ */}
        {step === 1 && (
          <div className="fpm-step">
            <div className="fpm-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="fpm-title">Forgot Password?</h3>
            <p className="fpm-subtitle">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && <div className="fpm-error">{error}</div>}

            <div className={`fpm-field ${email ? 'has-value' : ''}`}>
              <input
                id="fpm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && email && handleSendReset()}
              />
              <label htmlFor="fpm-email">Email Address</label>
            </div>

            <button
              className="fpm-btn fpm-btn-primary"
              onClick={handleSendReset}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        )}

        {/* ═══ Step 2: Animated Success ═══ */}
        {step === 2 && (
          <div className="fpm-step fpm-success-step">
            {/* Animated checkmark */}
            <div className="fpm-checkmark-circle">
              <svg className="fpm-checkmark-svg" viewBox="0 0 52 52">
                <circle className="fpm-checkmark-ring" cx="26" cy="26" r="24" fill="none" />
                <path className="fpm-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 className="fpm-title fpm-success-title">Reset Link Sent!</h3>
            <p className="fpm-subtitle fpm-success-subtitle">
              We've sent a password reset link to
            </p>
            <p className="fpm-email-badge fpm-success-badge">{email}</p>
            <p className="fpm-hint fpm-success-hint">
              Click the link in the email to set your new password. Don't forget to check your spam folder!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal
