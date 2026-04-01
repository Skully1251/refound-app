import { useNavigate } from 'react-router-dom'
import refoundLogo from '../assets/ReFound logo.png'
import './SplashScreen.css'

function SplashScreen() {
  const navigate = useNavigate()

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
