import { useNavigate } from 'react-router-dom'
import './PasswordSuccessScreen.css'

function PasswordSuccessScreen() {
  const navigate = useNavigate()

  return (
    <div className="ps-container">
      <div className="ps-card">
        {/* Checkmark Icon */}
        <div className="ps-icon-wrapper">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 12 10 16 18 8" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="ps-title">Successful</h1>

        {/* Message */}
        <p className="ps-message">
          Congratulations! Your password has been changed. Click continue to login.
        </p>

        {/* Continue Button */}
        <button
          id="ps-continue-btn"
          className="btn ps-btn-continue"
          onClick={() => navigate('/login')}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default PasswordSuccessScreen
