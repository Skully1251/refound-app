import { useState, useEffect } from 'react'
import { subscribeToAllClaims, getItemById, getUserProfile } from '../../firebase/firestore'
import DashboardLayout from '../../components/DashboardLayout'
import './AdminClaims.css'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Claims' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function AdminClaims() {
  const [claims, setClaims] = useState([])
  const [itemsMap, setItemsMap] = useState({})
  const [usersMap, setUsersMap] = useState({})
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const unsub = subscribeToAllClaims(async (data) => {
      setClaims(data)
      const im = { ...itemsMap }
      const um = { ...usersMap }
      for (const c of data) {
        if (!im[c.itemId]) { const i = await getItemById(c.itemId); if (i) im[c.itemId] = i }
        if (!um[c.userId]) { const u = await getUserProfile(c.userId); if (u) um[c.userId] = u }
      }
      setItemsMap(im)
      setUsersMap(um)
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = claims.filter(c => filter === 'all' || c.status === filter)

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const badge = {
    pending: { label: 'Pending', cls: 'ac-badge-pending' },
    approved: { label: 'Approved', cls: 'ac-badge-approved' },
    rejected: { label: 'Rejected', cls: 'ac-badge-rejected' },
  }

  // Helper to get question text
  const getQuestionText = (q) => {
    if (typeof q === 'string') return q
    if (typeof q === 'object' && q !== null) return q.question || ''
    return ''
  }

  return (
    <DashboardLayout pageTitle="All Claims">
      <div className="ac-controls">
        <select className="ac-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTER_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <span className="ac-count">{filtered.length} claims</span>
      </div>

      <div className="ac-list">
        {loading ? (
          <div className="admin-empty">No claims found</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No claims found</div>
        ) : (
          filtered.map(c => {
            const item = itemsMap[c.itemId]
            const user = usersMap[c.userId]
            const b = badge[c.status] || badge.pending
            const isExpanded = expandedId === c.id
            return (
              <div
                className={`ac-card ${isExpanded ? 'ac-card-expanded' : ''}`}
                key={c.id}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                <div className="ac-card-top">
                  <div>
                    <h3 className="ac-card-item">{item?.title || 'Unknown'}</h3>
                    <span className="ac-card-user">{user?.name || c.userEmail || 'User'}</span>
                  </div>
                  <div className="ac-card-right">
                    <span className={`ac-card-badge ${b.cls}`}>{b.label}</span>
                    <svg className={`ac-chevron ${isExpanded ? 'ac-chevron-open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                <span className="ac-card-date">{formatDate(c.createdAt)}</span>

                {isExpanded && (
                  <div className="ac-card-details">
                    {/* Claimant Info */}
                    <div className="ac-detail-section">
                      <h4 className="ac-detail-heading">Claimant Info</h4>
                      <div className="ac-detail-grid">
                        <div className="ac-detail-item">
                          <span className="ac-detail-label">Name</span>
                          <span className="ac-detail-value">{user?.name || c.userName || 'Unknown'}</span>
                        </div>
                        <div className="ac-detail-item">
                          <span className="ac-detail-label">Email</span>
                          <span className="ac-detail-value">{user?.email || c.userEmail || '—'}</span>
                        </div>
                        {c.enrollmentNumber && (
                          <div className="ac-detail-item">
                            <span className="ac-detail-label">Enrollment No.</span>
                            <span className="ac-detail-value ac-detail-enrollment">{c.enrollmentNumber}</span>
                          </div>
                        )}
                      </div>
                      {c.idCardUrl && (
                        <div className="ac-detail-item" style={{ marginTop: '8px' }}>
                          <span className="ac-detail-label">ID Card</span>
                          <img className="ac-detail-idcard" src={c.idCardUrl} alt="ID Card" />
                        </div>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="ac-detail-section">
                      <h4 className="ac-detail-heading">Item Details</h4>
                      <div className="ac-detail-grid">
                        <div className="ac-detail-item">
                          <span className="ac-detail-label">Item</span>
                          <span className="ac-detail-value">{item?.title || 'Unknown'}</span>
                        </div>
                        <div className="ac-detail-item">
                          <span className="ac-detail-label">Category</span>
                          <span className="ac-detail-value">{item?.category || '—'}</span>
                        </div>
                        <div className="ac-detail-item">
                          <span className="ac-detail-label">Found At</span>
                          <span className="ac-detail-value">{item?.location || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Claim Details */}
                    {(c.estimatedLocation || c.itemDescription) && (
                      <div className="ac-detail-section">
                        <h4 className="ac-detail-heading">Student's Description</h4>
                        {c.estimatedLocation && (
                          <div className="ac-detail-item">
                            <span className="ac-detail-label">Lost Near</span>
                            <span className="ac-detail-value">{c.estimatedLocation}</span>
                          </div>
                        )}
                        {c.itemDescription && (
                          <div className="ac-detail-item">
                            <span className="ac-detail-label">Description</span>
                            <span className="ac-detail-value">{c.itemDescription}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verification Q&A */}
                    {c.questions && c.questions.length > 0 && (
                      <div className="ac-detail-section">
                        <h4 className="ac-detail-heading">Verification Answers</h4>
                        <div className="ac-qa-list">
                          {c.questions.map((qa, i) => (
                            <div key={i} className="ac-qa-row">
                              <span className="ac-qa-q">Q{i + 1}: {getQuestionText(qa.question || qa)}</span>
                              <span className="ac-qa-a">A: {qa.answer || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {c.rejectionReason && (
                      <div className="ac-detail-section">
                        <h4 className="ac-detail-heading">Rejection Reason</h4>
                        <p className="ac-detail-rejection">{c.rejectionReason}</p>
                      </div>
                    )}

                    {/* Status */}
                    <div className="ac-detail-status">
                      <span className={`ac-detail-status-badge ${b.cls}`}>{b.label}</span>
                      {c.decisionAt && <span className="ac-detail-decided">Decided {formatDate(c.decisionAt)}</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminClaims
