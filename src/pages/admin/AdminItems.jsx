import { useState, useEffect } from 'react'
import { subscribeToItems } from '../../firebase/firestore'
import DashboardLayout from '../../components/DashboardLayout'
import './AdminItems.css'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Items' },
  { key: 'open', label: 'Open' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'returned', label: 'Returned' },
]

const categoryIcons = {
  Bags: '🎒', Electronics: '🔌', 'ID / Cards': '🪪', Accessories: '👓',
  Bottles: '🧴', Stationery: '📓', Clothing: '👕', Books: '📚',
  Keys: '🔑', Other: '📦',
}

function AdminItems() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const unsub = subscribeToItems((data) => {
      setItems(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = items.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!(item.title?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const statusBadge = {
    open: { label: 'Open', cls: 'ai-badge-open' },
    claimed: { label: 'Claimed', cls: 'ai-badge-claimed' },
    returned: { label: 'Returned', cls: 'ai-badge-returned' },
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Stats
  const openItems = items.filter(i => i.status === 'open').length
  const claimedItems = items.filter(i => i.status === 'claimed').length
  const returnedItems = items.filter(i => i.status === 'returned').length

  return (
    <DashboardLayout pageTitle="All Items">
      {/* Stats */}
      <div className="ai-stats">
        <div className="ai-stat"><span className="ai-stat-num">{items.length}</span><span className="ai-stat-label">Total</span></div>
        <div className="ai-stat ai-stat-open"><span className="ai-stat-num">{openItems}</span><span className="ai-stat-label">Open</span></div>
        <div className="ai-stat ai-stat-claimed"><span className="ai-stat-num">{claimedItems}</span><span className="ai-stat-label">Claimed</span></div>
        <div className="ai-stat ai-stat-returned"><span className="ai-stat-num">{returnedItems}</span><span className="ai-stat-label">Returned</span></div>
      </div>

      {/* Controls */}
      <div className="ai-controls">
        <input
          className="ai-search"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="ai-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTER_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>

      {/* Items  */}
      <div className="ai-list">
        {loading ? (
          <div className="admin-empty">
            <span>📦</span>
            <p>No items found</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <span>📭</span>
            <p>No items match your search</p>
          </div>
        ) : (
          filtered.map(item => {
            const sb = statusBadge[item.status] || statusBadge.open
            const isExpanded = expandedId === item.id
            return (
              <div
                className={`ai-card ${isExpanded ? 'ai-card-expanded' : ''}`}
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="ai-card-header">
                  <div className="ai-card-img" style={{
                    background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : '#4A90D9'
                  }}>
                    {!item.imageUrl && <span>{categoryIcons[item.category] || '📦'}</span>}
                  </div>
                  <div className="ai-card-info">
                    <div className="ai-card-top">
                      <h3 className="ai-card-title">{item.title}</h3>
                      <span className={`ai-card-badge ${sb.cls}`}>{sb.label}</span>
                    </div>
                    <span className="ai-card-meta">{item.category} • {item.location}</span>
                    <span className="ai-card-date">{formatDate(item.createdAt)}</span>
                  </div>
                  <svg className={`ai-chevron ${isExpanded ? 'ai-chevron-open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="ai-card-details">
                    {item.description && (
                      <div className="ai-detail-row">
                        <span className="ai-detail-label">Description</span>
                        <p className="ai-detail-value">{item.description}</p>
                      </div>
                    )}
                    {item.reportedBy && (
                      <div className="ai-detail-row">
                        <span className="ai-detail-label">Reported By</span>
                        <p className="ai-detail-value">{item.reportedByName || item.reportedBy}</p>
                      </div>
                    )}
                    {item.questions && item.questions.length > 0 && (
                      <div className="ai-detail-row">
                        <span className="ai-detail-label">Verification Questions</span>
                        <ul className="ai-detail-questions">
                          {item.questions.map((q, i) => (
                            <li key={i}>{typeof q === 'string' ? q : q.question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.imageUrl && (
                      <div className="ai-detail-row">
                        <span className="ai-detail-label">Image</span>
                        <img className="ai-detail-img" src={item.imageUrl} alt={item.title} />
                      </div>
                    )}
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

export default AdminItems
