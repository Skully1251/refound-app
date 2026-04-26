import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToItems, createClaim, getUserClaimsForItem, notifyAllEmployees } from '../firebase/firestore'
import { sendPushToEmployees } from '../firebase/onesignal'
import { uploadImageToCloudinary } from '../firebase/cloudinary'
import { useToast } from '../components/Toast'
import DashboardLayout from '../components/DashboardLayout'
import './DashboardScreen.css'

const FILTER_OPTIONS = [
  { key: 'open', label: 'Open' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'returned', label: 'Returned' },
]

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
]

const categoryIcons = {
  Bags: '🎒',
  Electronics: '🔌',
  'ID / Cards': '🪪',
  Accessories: '👓',
  Bottles: '🧴',
  Stationery: '📓',
  Clothing: '👕',
  Books: '📚',
  Keys: '🔑',
  Other: '📦',
}

const categoryColors = {
  Bags: '#4A90D9',
  Electronics: '#7B8794',
  'ID / Cards': '#E8752A',
  Accessories: '#D4A017',
  Bottles: '#27AE60',
  Stationery: '#E74C3C',
  Clothing: '#636E72',
  Books: '#8E44AD',
  Keys: '#1ABC9C',
  Other: '#2C3E50',
}

function DashboardScreen() {
  const { currentUser } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('open')
  const [sortBy, setSortBy] = useState('newest')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Claim modal state
  const [claimModal, setClaimModal] = useState(null)
  const [claimAnswers, setClaimAnswers] = useState({})
  const [claimLocation, setClaimLocation] = useState('')
  const [claimDescription, setClaimDescription] = useState('')
  const [claimEnrollment, setClaimEnrollment] = useState('')
  const [claimIdCard, setClaimIdCard] = useState(null)
  const [claimIdCardPreview, setClaimIdCardPreview] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    const unsub = subscribeToItems((data) => setItems(data))
    return unsub
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category))
    return [{ key: 'all', label: 'All Categories' }, ...Array.from(cats).map(c => ({ key: c, label: c }))]
  }, [items])

  const filtered = useMemo(() => {
    let result = items.filter((item) => item.status === activeFilter)

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0)
      const bTime = b.createdAt?.toDate?.() || new Date(0)
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime
    })

    return result
  }, [items, search, activeFilter, sortBy, categoryFilter])

  const statusLabel = {
    open: 'Open',
    claimed: 'Claimed',
    returned: 'Returned',
  }

  const handleClaimClick = async (item) => {
    const existingClaims = await getUserClaimsForItem(currentUser.uid, item.id)
    
    if (existingClaims.length > 0) {
      // Check if any claim is pending or approved
      const pendingOrApproved = existingClaims.find(c => c.status === 'pending' || c.status === 'approved')
      if (pendingOrApproved) {
        toast.showWarning('You have already submitted a claim for this item.')
        return
      }
      
      // Check if the most recent rejected claim is within the 1-day cooldown
      const rejectedClaims = existingClaims.filter(c => c.status === 'rejected')
      if (rejectedClaims.length > 0) {
        const latestRejected = rejectedClaims[0] // already sorted by createdAt desc
        const decisionTime = latestRejected.decisionAt?.toDate?.() || latestRejected.decisionAt
        if (decisionTime) {
          const cooldownEnd = new Date(decisionTime.getTime() + 24 * 60 * 60 * 1000)
          if (new Date() < cooldownEnd) {
            const hoursLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60))
            toast.showWarning(`Your previous claim was rejected. You can re-claim in ${hoursLeft} hour(s).`)
            return
          }
        }
      }
    }
    setClaimModal(item)
    setClaimAnswers({})
    setClaimLocation('')
    setClaimDescription('')
    setClaimEnrollment('')
    setClaimIdCard(null)
    setClaimIdCardPreview('')
    setClaimError('')
  }

  // Helper: extract question text from either string or object format
  const getQuestionText = (q) => {
    if (typeof q === 'string') return q
    if (typeof q === 'object' && q !== null) return q.question || ''
    return ''
  }

  const handleClaimSubmit = async () => {
    if (!claimModal) return

    // Validate enrollment number
    if (!claimEnrollment.trim()) {
      setClaimError('Enrollment number is required.')
      return
    }

    // Validate ID card photo
    if (!claimIdCard) {
      setClaimError('Please upload a photo of your ID card.')
      return
    }

    const questions = claimModal.questions || []
    // Validate all questions answered
    for (let i = 0; i < questions.length; i++) {
      if (!claimAnswers[i]?.trim()) {
        setClaimError('Please answer all verification questions.')
        return
      }
    }

    setClaimLoading(true)
    setClaimError('')
    try {
      // Upload ID card to Cloudinary
      const idCardUrl = await uploadImageToCloudinary(claimIdCard)

      await createClaim({
        itemId: claimModal.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userEmail: currentUser.email,
        enrollmentNumber: claimEnrollment.trim(),
        idCardUrl,
        estimatedLocation: claimLocation.trim() || null,
        itemDescription: claimDescription.trim() || null,
        questions: questions.map((q, i) => ({
          question: getQuestionText(q),
          answer: claimAnswers[i] || ''
        }))
      })

      // Notify all employees about the new claim (in-app + push)
      const studentName = currentUser.displayName || 'A student'
      notifyAllEmployees(
        `${studentName} submitted a claim for "${claimModal.title}". Review it now!`,
        'new_claim'
      ).catch(err => console.warn('Employee in-app notification failed:', err))

      sendPushToEmployees(
        'New Claim Submitted',
        `${studentName} claimed "${claimModal.title}". Tap to review.`,
        '/emp/review-claims'
      ).catch(err => console.warn('Employee push notification failed:', err))

      setClaimModal(null)
      toast.showSuccess('Claim submitted successfully! You will be notified once it is reviewed.')
    } catch (err) {
      setClaimError(err.message || 'Failed to submit claim')
    } finally {
      setClaimLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DashboardLayout pageTitle="Dashboard">
      {/* Search */}
      <div className="dash-search-wrapper">
        <svg className="dash-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="dashboard-search"
          className="dash-search-input"
          type="text"
          placeholder="Search lost items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="dash-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      {/* Filters & Sort */}
      <div className="dash-controls">
        <select
          id="dashboard-status-filter"
          className="dash-sort-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          {FILTER_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <select
          id="dashboard-category"
          className="dash-sort-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select
          id="dashboard-sort"
          className="dash-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="dash-items">
        {filtered.length === 0 ? (
          <div className="dash-empty">
            <span className="dash-empty-icon">📭</span>
            <p>No items found</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div className="dash-card" key={item.id}>
              <div className="dash-card-img" style={{
                background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : (categoryColors[item.category] || '#2C3E50')
              }}>
                {!item.imageUrl && (
                  <span className="dash-card-emoji">{categoryIcons[item.category] || '📦'}</span>
                )}
              </div>
              <div className="dash-card-body">
                <div className="dash-card-top">
                  <h3 className="dash-card-name">{item.title}</h3>
                  <span className={`dash-card-badge badge-${item.status}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <span className="dash-card-category">{item.category}</span>
                {item.description && (
                  <p className="dash-card-desc">{item.description}</p>
                )}
                <div className="dash-card-meta">
                  <span className="dash-card-location">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {item.location}
                  </span>
                  <span className="dash-card-date">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                {item.status === 'open' && (
                  <button className="dash-claim-btn" onClick={() => handleClaimClick(item)}>
                    Claim
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Claim Modal */}
      {claimModal && (
        <div className="claim-modal-overlay" onClick={() => setClaimModal(null)}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="claim-modal-title">Claim: {claimModal.title}</h3>
            <p className="claim-modal-subtitle">Provide details and answer the verification questions to submit your claim.</p>

            {claimError && <div className="auth-error">{claimError}</div>}

            {/* Required identity fields */}
            <div className="claim-extra-fields">
              <div className="claim-field-group">
                <label className="claim-field-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Enrollment Number <span className="claim-required">*</span>
                </label>
                <input
                  className="claim-question-input"
                  type="text"
                  placeholder="e.g. 22014802720"
                  value={claimEnrollment}
                  onChange={(e) => setClaimEnrollment(e.target.value)}
                />
              </div>
              <div className="claim-field-group">
                <label className="claim-field-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  ID Card Photo (front) <span className="claim-required">*</span>
                </label>
                <div className="claim-idcard-upload">
                  {claimIdCardPreview ? (
                    <div className="claim-idcard-preview-wrapper">
                      <img className="claim-idcard-preview" src={claimIdCardPreview} alt="ID Card" />
                      <button className="claim-idcard-remove" onClick={() => { setClaimIdCard(null); setClaimIdCardPreview('') }}>✕</button>
                    </div>
                  ) : (
                    <label className="claim-idcard-btn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload ID Card</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              setClaimError('ID card image must be under 5MB.')
                              return
                            }
                            setClaimIdCard(file)
                            setClaimIdCardPreview(URL.createObjectURL(file))
                            setClaimError('')
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="claim-divider">
              <span>Additional Details</span>
            </div>

            {/* Optional fields */}
            <div className="claim-extra-fields">
              <div className="claim-field-group">
                <label className="claim-field-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Where did you lose it? <span className="claim-optional">(optional)</span>
                </label>
                <input
                  className="claim-question-input"
                  type="text"
                  placeholder="e.g. Near the cafeteria, Block 5..."
                  value={claimLocation}
                  onChange={(e) => setClaimLocation(e.target.value)}
                />
              </div>
              <div className="claim-field-group">
                <label className="claim-field-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="17" y1="10" x2="3" y2="10" />
                    <line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" />
                    <line x1="17" y1="18" x2="3" y2="18" />
                  </svg>
                  Describe your item <span className="claim-optional">(optional)</span>
                </label>
                <textarea
                  className="claim-description-input"
                  rows="2"
                  placeholder="Any details that can help verify your ownership..."
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="claim-divider">
              <span>Verification Questions</span>
            </div>

            <div className="claim-questions">
              {(claimModal.questions || []).map((q, i) => (
                <div key={i} className="claim-question-group">
                  <label className="claim-question-label">{i + 1}. {getQuestionText(q)}</label>
                  <input
                    className="claim-question-input"
                    type="text"
                    placeholder="Your answer"
                    value={claimAnswers[i] || ''}
                    onChange={(e) => setClaimAnswers({ ...claimAnswers, [i]: e.target.value })}
                  />
                </div>
              ))}
              {(!claimModal.questions || claimModal.questions.length === 0) && (
                <p className="claim-no-questions">No verification questions set. Your claim will be submitted for review.</p>
              )}
            </div>

            <div className="claim-modal-actions">
              <button className="claim-modal-cancel" onClick={() => setClaimModal(null)}>Cancel</button>
              <button className="claim-modal-submit" onClick={handleClaimSubmit} disabled={claimLoading}>
                {claimLoading ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default DashboardScreen
