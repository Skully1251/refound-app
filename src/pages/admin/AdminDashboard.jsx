import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  subscribeToPendingPromotions, updatePromotionStatus, updateUserRole,
  subscribeToItems, subscribeToAllClaims,
  createNotification, createAuditLog, getAllUsers
} from '../../firebase/firestore'
import { useToast } from '../../components/Toast'
import DashboardLayout from '../../components/DashboardLayout'
import './AdminDashboard.css'

function AdminDashboard() {
  const { currentUser, userProfile } = useAuth()
  const toast = useToast()
  const [promotions, setPromotions] = useState([])
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [usersCount, setUsersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const unsub1 = subscribeToPendingPromotions((data) => setPromotions(data))
    const unsub2 = subscribeToItems((data) => setItems(data))
    const unsub3 = subscribeToAllClaims((data) => {
      setClaims(data)
      setLoading(false)
    })
    getAllUsers().then(users => setUsersCount(users.length))

    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  const handlePromotionAccept = async (req) => {
    setActionLoading(req.id)
    try {
      await updateUserRole(req.userId, 'employee')
      await updatePromotionStatus(req.id, 'approved')
      await createNotification({
        userId: req.userId,
        message: 'Your promotion request has been approved! You are now an Employee.',
        type: 'promotion_update'
      })
      await createAuditLog({
        actionType: 'promotion_approved',
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Admin',
        newValue: `${req.userName} promoted to employee`,
      })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePromotionReject = async (req) => {
    setActionLoading(req.id)
    try {
      await updatePromotionStatus(req.id, 'rejected')
      await createNotification({
        userId: req.userId,
        message: 'Your promotion request has been reviewed and declined.',
        type: 'promotion_update'
      })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const openItems = items.filter(i => i.status === 'open').length
  const returnedItems = items.filter(i => i.status === 'returned').length
  const pendingClaims = claims.filter(c => c.status === 'pending').length

  return (
    <DashboardLayout pageTitle="Admin Panel">
      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-num">{items.length}</span>
          <span className="admin-stat-label">Items</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-num">{claims.length}</span>
          <span className="admin-stat-label">Claims</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-num">{pendingClaims}</span>
          <span className="admin-stat-label">Pending</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-num">{usersCount}</span>
          <span className="admin-stat-label">Users</span>
        </div>
      </div>

      {/* Quick summary */}
      <div className="admin-summary-row">
        <div className="admin-summary-card admin-sum-open">
          <span>{openItems}</span>
          <span>Open Items</span>
        </div>
        <div className="admin-summary-card admin-sum-returned">
          <span>{returnedItems}</span>
          <span>Returned</span>
        </div>
        <div className="admin-summary-card admin-sum-promo">
          <span>{promotions.length}</span>
          <span>Promotion Requests</span>
        </div>
      </div>

      {/* Promotion Requests */}
      <div className="admin-section">
        <h2 className="admin-section-title">Promotion Requests</h2>
        {promotions.length === 0 ? (
          <div className="admin-empty">No pending requests</div>
        ) : (
          <div className="admin-promo-list">
            {promotions.map(req => (
              <div className="admin-promo-card" key={req.id}>
                <div className="admin-promo-info">
                  <h3>{req.userName}</h3>
                  <span>{req.userEmail}</span>
                </div>
                <div className="admin-promo-actions">
                  <button
                    className="admin-promo-accept"
                    onClick={() => handlePromotionAccept(req)}
                    disabled={actionLoading === req.id}
                  >
                    ✓
                  </button>
                  <button
                    className="admin-promo-reject"
                    onClick={() => handlePromotionReject(req)}
                    disabled={actionLoading === req.id}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard
