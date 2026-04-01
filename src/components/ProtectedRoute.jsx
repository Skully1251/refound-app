import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps routes that require authentication.
 * Redirects to /login if not logged in, or shows a message if suspended.
 */
function ProtectedRoute({ children }) {
  const { currentUser, userProfile, loading, isSuspended } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg, #f5f6fa)'
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
        }}>
          <div className="loader-spinner" />
          <p style={{ color: 'var(--text-light, #64748b)', fontSize: '0.95rem' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (isSuspended) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fef2f2', padding: '2rem'
      }}>
        <div style={{
          background: '#fff', borderRadius: '1rem', padding: '2.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem' }}>🚫</span>
          <h2 style={{ color: '#dc2626', margin: '1rem 0 0.5rem' }}>Account Suspended</h2>
          <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
            Your account has been suspended. Please contact the administrator for more information.
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
