import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToUserClaims, getItemById } from '../firebase/firestore'
import DashboardLayout from '../components/DashboardLayout'
import './HistoryScreen.css'

const categoryIcons = {
  Bags: '🎒', Electronics: '🔌', 'ID / Cards': '🪪', Accessories: '👓',
  Bottles: '🧴', Stationery: '📓', Clothing: '👕', Books: '📚',
  Keys: '🔑', Other: '📦',
}

const statusConfig = {
  pending: { label: 'Pending', className: 'badge-pending' },
  approved: { label: 'Approved', className: 'badge-approved' },
  rejected: { label: 'Rejected', className: 'badge-rejected' },
}

function MyClaimsScreen() {
  const { currentUser } = useAuth()
  const [claims, setClaims] = useState([])
  const [itemsMap, setItemsMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    const unsub = subscribeToUserClaims(currentUser.uid, async (claimsData) => {
      setClaims(claimsData)

      // Fetch item details for each claim
      const newItemsMap = { ...itemsMap }
      for (const claim of claimsData) {
        if (!newItemsMap[claim.itemId]) {
          const item = await getItemById(claim.itemId)
          if (item) newItemsMap[claim.itemId] = item
        }
      }
      setItemsMap(newItemsMap)
      setLoading(false)
    })
    return unsub
  }, [currentUser])

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DashboardLayout pageTitle="My Claims">
      <p className="history-subtitle">Items you've claimed</p>

      {loading ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">📋</span>
          <p>No claims yet</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">📋</span>
          <p>No claims yet</p>
        </div>
      ) : (
        <div className="history-items">
          {claims.map((claim) => {
            const item = itemsMap[claim.itemId]
            const config = statusConfig[claim.status] || statusConfig.pending
            return (
              <div className="history-card" key={claim.id}>
                <div className="history-card-img" style={{
                  background: item?.imageUrl
                    ? `url(${item.imageUrl}) center/cover`
                    : '#4A90D9'
                }}>
                  {!item?.imageUrl && (
                    <span className="history-card-emoji">{categoryIcons[item?.category] || '📦'}</span>
                  )}
                </div>
                <div className="history-card-body">
                  <div className="history-card-top">
                    <h3 className="history-card-name">{item?.title || 'Unknown Item'}</h3>
                    <span className={`history-card-badge ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="history-card-category">{item?.category || ''}</span>
                  {claim.rejectionReason && (
                    <p className="history-card-reason">Reason: {claim.rejectionReason}</p>
                  )}
                  <div className="history-card-meta">
                    <span className="history-card-location">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {item?.location || ''}
                    </span>
                    <span className="history-card-date">
                      Claimed {formatDate(claim.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

export default MyClaimsScreen
