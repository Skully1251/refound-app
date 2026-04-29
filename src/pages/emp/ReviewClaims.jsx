import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  subscribeToAllClaims, getItemById, getUserProfile,
  updateClaimStatus, approveClaimTransaction, rejectOtherPendingClaims,
  updateItemStatus, lockItem, unlockItem,
  createNotification, createAuditLog
} from '../../firebase/firestore'
import { sendPushToUser } from '../../firebase/onesignal'
import { useToast } from '../../components/Toast'
import DashboardLayout from '../../components/DashboardLayout'
import './ReviewClaims.css'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Claims' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function ReviewClaims() {
  const { currentUser, userProfile } = useAuth()
  const toast = useToast()
  const [claims, setClaims] = useState([])
  const [itemsMap, setItemsMap] = useState({})
  const [usersMap, setUsersMap] = useState({})
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  // Review modal
  const [reviewClaim, setReviewClaim] = useState(null)
  const [reviewItem, setReviewItem] = useState(null)
  const [reviewUser, setReviewUser] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [lockError, setLockError] = useState('')

  // Lock timer
  const lockTimerRef = useRef(null)
  const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    const unsub = subscribeToAllClaims(async (claimsData) => {
      setClaims(claimsData)

      // Fetch items and users
      const newItemsMap = { ...itemsMap }
      const newUsersMap = { ...usersMap }

      for (const claim of claimsData) {
        if (!newItemsMap[claim.itemId]) {
          const item = await getItemById(claim.itemId)
          if (item) newItemsMap[claim.itemId] = item
        }
        if (!newUsersMap[claim.userId]) {
          const user = await getUserProfile(claim.userId)
          if (user) newUsersMap[claim.userId] = user
        }
      }
      setItemsMap(newItemsMap)
      setUsersMap(newUsersMap)
      setLoading(false)
    })
    return () => {
      unsub()
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [])

  const filteredClaims = claims.filter(c => filter === 'all' || c.status === filter)

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const openReview = async (claim) => {
    setLockError('')
    setRejectReason('')
    const item = itemsMap[claim.itemId]
    const user = usersMap[claim.userId]

    // Try to lock the item
    try {
      await lockItem(claim.itemId, currentUser.uid)
    } catch (err) {
      setLockError(err.message)
      return
    }

    setReviewClaim(claim)
    setReviewItem(item)
    setReviewUser(user)

    // Start lock timeout
    lockTimerRef.current = setTimeout(() => {
      toast.showWarning('Lock expired! You took too long. Redirecting...')
      closeReview()
    }, LOCK_TIMEOUT)
  }

  const closeReview = async () => {
    if (reviewClaim) {
      try {
        await unlockItem(reviewClaim.itemId)
      } catch (e) { /* ignore */ }
    }
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    setReviewClaim(null)
    setReviewItem(null)
    setReviewUser(null)
    setRejectReason('')
    setLockError('')
  }

  const handleApprove = async () => {
    if (!reviewClaim) return
    setActionLoading(true)
    try {
      await approveClaimTransaction(reviewClaim.id, reviewClaim.itemId, currentUser.uid)
      await rejectOtherPendingClaims(reviewClaim.itemId, reviewClaim.id)

      // Notify the claimant (in-app)
      await createNotification({
        userId: reviewClaim.userId,
        message: `Your claim for "${reviewItem?.title || 'item'}" has been approved! Please visit the helpdesk to collect it.`,
        type: 'claim_update'
      })

      // Push notification to the claimant
      sendPushToUser(
        reviewClaim.userId,
        'Claim Approved! ✅',
        `Your claim for "${reviewItem?.title || 'item'}" has been approved! Visit the helpdesk to collect it.`,
        '/my-claims'
      ).catch(err => console.warn('Push to claimant failed:', err))

      // Audit log
      await createAuditLog({
        actionType: 'claim_approved',
        itemId: reviewClaim.itemId,
        claimId: reviewClaim.id,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Employee',
        previousValue: 'pending',
        newValue: 'approved',
      })

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      setReviewClaim(null)
      setReviewItem(null)
      setReviewUser(null)
    } catch (err) {
      toast.showError(err.message || 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reviewClaim) return
    if (!rejectReason.trim()) {
      toast.showWarning('Please provide a rejection reason.')
      return
    }
    setActionLoading(true)
    try {
      await updateClaimStatus(reviewClaim.id, 'rejected', {
        rejectionReason: rejectReason,
        approvedBy: currentUser.uid,
      })

      await unlockItem(reviewClaim.itemId)

      // Notify the claimant (in-app)
      await createNotification({
        userId: reviewClaim.userId,
        message: `Your claim for "${reviewItem?.title || 'item'}" was rejected. Reason: ${rejectReason}`,
        type: 'claim_update'
      })

      // Push notification to the claimant
      sendPushToUser(
        reviewClaim.userId,
        'Claim Rejected',
        `Your claim for "${reviewItem?.title || 'item'}" was rejected. Reason: ${rejectReason}`,
        '/my-claims'
      ).catch(err => console.warn('Push to claimant failed:', err))

      await createAuditLog({
        actionType: 'claim_rejected',
        itemId: reviewClaim.itemId,
        claimId: reviewClaim.id,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Employee',
        previousValue: 'pending',
        newValue: 'rejected',
      })

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      setReviewClaim(null)
      setReviewItem(null)
      setReviewUser(null)
      setRejectReason('')
    } catch (err) {
      toast.showError(err.message || 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetPending = async () => {
    if (!reviewClaim) return
    setActionLoading(true)
    try {
      await updateClaimStatus(reviewClaim.id, 'pending')
      await unlockItem(reviewClaim.itemId)

      await createAuditLog({
        actionType: 'claim_set_pending',
        itemId: reviewClaim.itemId,
        claimId: reviewClaim.id,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Employee',
        newValue: 'pending',
      })

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      setReviewClaim(null)
      setReviewItem(null)
      setReviewUser(null)
    } catch (err) {
      toast.showError(err.message || 'Failed to update')
    } finally {
      setActionLoading(false)
    }
  }

  /**
   * Build a comparison list of expected vs actual answers.
   * Supports both old items (questions = string[]) and new items (questions = {question, expectedAnswer}[])
   */
  const buildAnswerComparison = () => {
    if (!reviewClaim || !reviewItem) return []

    const claimQA = reviewClaim.questions || [] // [{question, answer}]
    const itemQuestions = reviewItem.questions || [] // [{question, expectedAnswer}] or string[]

    return claimQA.map((qa, i) => {
      // Find matching item question by index
      const itemQ = itemQuestions[i]
      let expectedAnswer = ''

      if (typeof itemQ === 'object' && itemQ !== null) {
        expectedAnswer = itemQ.expectedAnswer || ''
      }
      // If itemQ is a string (old format), there's no expected answer

      // Simple similarity check
      const studentAnswer = (qa.answer || '').trim().toLowerCase()
      const expected = expectedAnswer.trim().toLowerCase()
      let match = 'none'
      if (expected && studentAnswer) {
        if (studentAnswer === expected) {
          match = 'exact'
        } else if (expected.includes(studentAnswer) || studentAnswer.includes(expected)) {
          match = 'partial'
        }
      }

      return {
        question: qa.question,
        studentAnswer: qa.answer || '',
        expectedAnswer,
        match,
      }
    })
  }

  const statusBadge = {
    pending: { label: 'Pending', cls: 'rc-badge-pending' },
    approved: { label: 'Approved', cls: 'rc-badge-approved' },
    rejected: { label: 'Rejected', cls: 'rc-badge-rejected' },
  }

  const comparison = reviewClaim ? buildAnswerComparison() : []

  return (
    <DashboardLayout pageTitle="Review Claims">
      {/* Lock error toast */}
      {lockError && (
        <div className="rc-lock-error">
          🔒 {lockError}
          <button onClick={() => setLockError('')}>✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="rc-controls">
        <select className="rc-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTER_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <span className="rc-count">{filteredClaims.length} claims</span>
      </div>

      {/* Claims list */}
      <div className="rc-list">
        {loading ? (
          <div className="emp-empty">
            <span>📋</span>
            <p>No claims yet</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="emp-empty">
            <span>📋</span>
            <p>No claims found</p>
          </div>
        ) : (
          filteredClaims.map(claim => {
            const item = itemsMap[claim.itemId]
            const user = usersMap[claim.userId]
            const badge = statusBadge[claim.status] || statusBadge.pending
            return (
              <div className="rc-card" key={claim.id}>
                <div className="rc-card-header">
                  <div>
                    <h3 className="rc-card-item">{item?.title || 'Unknown Item'}</h3>
                    <span className="rc-card-user">by {user?.name || claim.userEmail || 'User'}</span>
                  </div>
                  <span className={`rc-card-badge ${badge.cls}`}>{badge.label}</span>
                </div>
                <span className="rc-card-date">{formatDate(claim.createdAt)}</span>
                {claim.status === 'pending' && (
                  <button className="rc-review-btn" onClick={() => openReview(claim)}>
                    Review Claim
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Review Modal */}
      {reviewClaim && (
        <div className="rc-modal-overlay" onClick={closeReview}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="rc-modal-title">Review Claim</h3>

            <div className="rc-modal-section">
              <h4>Item: {reviewItem?.title}</h4>
              <p className="rc-modal-meta">{reviewItem?.category} • {reviewItem?.location}</p>
            </div>

            <div className="rc-modal-section">
              <h4>Claimant: {reviewUser?.name || reviewClaim.userEmail}</h4>
              <p className="rc-modal-meta">{reviewClaim.userEmail}</p>
              {reviewClaim.enrollmentNumber && (
                <p className="rc-modal-meta">
                  <strong>Enrollment:</strong> {reviewClaim.enrollmentNumber}
                </p>
              )}
              {reviewClaim.ocrName && (
                <p className="rc-modal-meta">
                  <strong>Name (from ID):</strong> {reviewClaim.ocrName}
                </p>
              )}
              {reviewClaim.phoneNumber && (
                <p className="rc-modal-meta">
                  <strong>Phone:</strong> {reviewClaim.phoneNumber}
                </p>
              )}
              {reviewClaim.idCardUrl && (
                <div style={{ marginTop: '8px' }}>
                  <a href={reviewClaim.idCardUrl} target="_blank" rel="noopener noreferrer" className="rc-idcard-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    View ID Card
                  </a>
                </div>
              )}
            </div>

            {/* Answer comparison */}
            <div className="rc-modal-section">
              <h4>Verification Answers</h4>
              {comparison.length > 0 ? (
                comparison.map((c, i) => (
                  <div key={i} className={`rc-compare-row rc-compare-${c.match}`}>
                    <span className="rc-compare-q">Q{i + 1}: {c.question}</span>
                    <div className="rc-compare-answers">
                      <div className="rc-compare-answer">
                        <span className="rc-compare-label">Student's Answer</span>
                        <span className="rc-compare-value">{c.studentAnswer || '—'}</span>
                      </div>
                      {c.expectedAnswer && (
                        <div className="rc-compare-answer rc-compare-expected">
                          <span className="rc-compare-label">Expected Answer</span>
                          <span className="rc-compare-value">{c.expectedAnswer}</span>
                        </div>
                      )}
                    </div>
                    {c.expectedAnswer && (
                      <span className={`rc-match-badge rc-match-${c.match}`}>
                        {c.match === 'exact' ? '✅ Match' : c.match === 'partial' ? '🟡 Partial' : '❌ Mismatch'}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="rc-modal-meta">No verification questions were answered.</p>
              )}
            </div>

            {/* Reject reason input */}
            <div className="rc-modal-section">
              <label className="rc-reject-label">Rejection Reason (required for reject)</label>
              <textarea
                className="rc-reject-input"
                rows="2"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="rc-modal-actions">
              <button className="rc-btn rc-btn-approve" onClick={handleApprove} disabled={actionLoading}>
                ✅ Approve
              </button>
              <button className="rc-btn rc-btn-reject" onClick={handleReject} disabled={actionLoading}>
                ❌ Reject
              </button>
              <button className="rc-btn rc-btn-pending" onClick={handleSetPending} disabled={actionLoading}>
                ⏳ Pending
              </button>
            </div>

            <button className="rc-modal-close" onClick={closeReview}>Cancel</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default ReviewClaims
