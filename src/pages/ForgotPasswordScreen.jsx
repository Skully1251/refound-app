import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ForgotPasswordScreen.css'

function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleNext = (e) => {
    e.preventDefault()
    navigate('/enter-otp')
  }

  return (
    <div className="fp-container">
      <div className="fp-card">
        {/* Back Arrow */}
        <button className="fp-back-btn" onClick={() => navigate('/login')} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="fp-title">Forgot Password</h1>
        <p className="fp-subtitle">Enter the email address associated with your account.</p>

        {/* Form */}
        <form className="fp-form" onSubmit={handleNext}>
          <div className={`input-group floating-label ${email ? 'has-value' : ''}`}>
            <input
              id="fp-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder=" "
            />
            <label htmlFor="fp-email-input" className="float-label">Email Address</label>
          </div>

          <button id="fp-next-btn" type="submit" className="btn fp-btn-next">
            Next
            <span className="fp-arrow">→</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default ForgotPasswordScreen
