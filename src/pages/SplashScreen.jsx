import { useNavigate } from 'react-router-dom'
import './SplashScreen.css'

function SplashScreen() {
  const navigate = useNavigate()

  return (
    <div className="splash-container">
      <div className="splash-card">
        {/* Logo */}
        <div className="splash-logo-section">
          <div className="splash-logo-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Magnifying glass */}
              <circle cx="26" cy="26" r="14" stroke="#e8752a" strokeWidth="3.5" fill="none" />
              <line x1="36" y1="36" x2="48" y2="48" stroke="#e8752a" strokeWidth="3.5" strokeLinecap="round" />
              {/* Checkmark inside */}
              <polyline points="19,27 24,32 34,20" fill="none" stroke="#e8752a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
