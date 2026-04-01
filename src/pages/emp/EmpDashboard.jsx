import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { subscribeToItems } from '../../firebase/firestore'
import DashboardLayout from '../../components/DashboardLayout'
import './EmpDashboard.css'

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

function EmpDashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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
    open: { label: 'Open', cls: 'emp-badge-open' },
    claimed: { label: 'Claimed', cls: 'emp-badge-claimed' },
    returned: { label: 'Returned', cls: 'emp-badge-returned' },
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Stats
  const totalItems = items.length
  const openItems = items.filter(i => i.status === 'open').length
  const claimedItems = items.filter(i => i.status === 'claimed').length
  const returnedItems = items.filter(i => i.status === 'returned').length

  return (
    <DashboardLayout pageTitle="Emp Dashboard">
      {/* Stats Row */}
      <div className="emp-stats">
        <div className="emp-stat-card">
          <span className="emp-stat-num">{totalItems}</span>
          <span className="emp-stat-label">Total</span>
        </div>
        <div className="emp-stat-card emp-stat-open">
          <span className="emp-stat-num">{openItems}</span>
          <span className="emp-stat-label">Open</span>
        </div>
        <div className="emp-stat-card emp-stat-claimed">
          <span className="emp-stat-num">{claimedItems}</span>
          <span className="emp-stat-label">Claimed</span>
        </div>
        <div className="emp-stat-card emp-stat-returned">
          <span className="emp-stat-num">{returnedItems}</span>
          <span className="emp-stat-label">Returned</span>
        </div>
      </div>

      {/* Actions */}
      <button className="emp-report-btn" onClick={() => navigate('/emp/report-item')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Report New Item
      </button>

      {/* Search + Filter */}
      <div className="emp-controls">
        <input
          className="emp-search"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="emp-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTER_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>

      {/* Item list */}
      <div className="emp-items">
        {loading ? (
          <div className="emp-empty">
            <span>📭</span>
            <p>No items found</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="emp-empty">
            <span>📭</span>
            <p>No items found</p>
          </div>
        ) : (
          filtered.map(item => (
            <div className="emp-item-card" key={item.id}>
              <div className="emp-item-img" style={{
                background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : '#4A90D9'
              }}>
                {!item.imageUrl && <span>{categoryIcons[item.category] || '📦'}</span>}
              </div>
              <div className="emp-item-body">
                <div className="emp-item-top">
                  <h3 className="emp-item-title">{item.title}</h3>
                  <span className={`emp-item-badge ${statusBadge[item.status]?.cls || ''}`}>
                    {statusBadge[item.status]?.label || item.status}
                  </span>
                </div>
                <span className="emp-item-cat">{item.category} • {item.location}</span>
                <span className="emp-item-date">{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}

export default EmpDashboard
