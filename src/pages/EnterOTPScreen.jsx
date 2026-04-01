import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './EnterOTPScreen.css'

function EnterOTPScreen() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Auto-focus previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newOtp = [...otp]
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || ''
      }
      setOtp(newOtp)
      const focusIndex = Math.min(pasted.length, 5)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  const handleVerify = (e) => {
    e.preventDefault()
    navigate('/set-new-password')
  }

  return (
    <div className="otp-container">
      <div className="otp-card">
        {/* Back Arrow */}
        <button className="otp-back-btn" onClick={() => navigate('/forgot-password')} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="otp-title">Enter OTP</h1>
        <p className="otp-subtitle">We've sent a verification code to your email address.</p>

        {/* OTP Form */}
        <form className="otp-form" onSubmit={handleVerify}>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`otp-box ${digit ? 'has-value' : ''}`}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          <button id="otp-verify-btn" type="submit" className="btn otp-btn-verify">
            Verify Code
          </button>
        </form>

        {/* Resend */}
        <p className="otp-resend-text">
          Didn't get the code?{' '}
          <span className="otp-resend-link">Resend OTP</span>
        </p>
      </div>
    </div>
  )
}

export default EnterOTPScreen
