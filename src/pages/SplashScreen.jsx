import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import refoundLogo from '../assets/ReFound logo.png'
import './SplashScreen.css'

function SplashScreen() {
  const navigate = useNavigate()
  const { currentUser, userProfile, loading } = useAuth()

  // Auto-redirect if already logged in
  useEffect(() => {
    if (loading) return
    if (currentUser && userProfile) {
      if (userProfile.role === 'admin') navigate('/admin/dashboard', { replace: true })
      else if (userProfile.role === 'employee') navigate('/emp/dashboard', { replace: true })
      else navigate('/dashboard', { replace: true })
    }
  }, [currentUser, userProfile, loading, navigate])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="splash-container">
        <div className="splash-card" style={{ justifyContent: 'center' }}>
          <div className="splash-logo-icon">
            <img src={refoundLogo} alt="ReFound Logo" width="120" height="120" style={{ objectFit: 'contain' }} />
          </div>
          <h1 className="splash-title">ReFound</h1>
          <p className="splash-tagline">BRINGING THINGS BACK</p>
        </div>
      </div>
    )
  }

  // Don't show splash if user is logged in (redirect will happen via useEffect)
  if (currentUser && userProfile) return null

  return (
    <div className="splash-container">
      <div className="splash-card">
        {/* Logo */}
        <div className="splash-logo-section">
          <div className="splash-logo-icon">
            <img src={refoundLogo} alt="ReFound Logo" width="120" height="120" style={{ objectFit: 'contain' }} />
          </div>

          <h1 className="splash-title">ReFound</h1>
          <p className="splash-tagline">BRINGING THINGS BACK</p>
        </div>

        {/* Buttons */}
        <div className="splash-buttons">
          <button
            id="login-btn"
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
          <button
            id="create-account-btn"
            className="btn btn-secondary"
            onClick={() => navigate('/signup')}
          >
            Create an Account
          </button>
        </div>

        {/* Footer */}
        <footer className="splash-footer">
          ©2026 ReFound Technologies
        </footer>
      </div>
    </div>
  )
}

export default SplashScreen
