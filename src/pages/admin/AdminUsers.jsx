import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAllUsers, updateUserStatus, createNotification, createAuditLog } from '../../firebase/firestore'
import { sendPushToUser } from '../../firebase/onesignal'
import { useToast } from '../../components/Toast'
import DashboardLayout from '../../components/DashboardLayout'
import './AdminUsers.css'

function AdminUsers() {
  const { currentUser, userProfile } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)

  // Reason modal
  const [banModal, setBanModal] = useState(null)
  const [banReason, setBanReason] = useState('')

  const fetchUsers = async () => {
    const allUsers = await getAllUsers()
    setUsers(allUsers)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = users.filter(u => {
    if (filter === 'all') return true
    if (filter === 'active') return u.status === 'active'
    if (filter === 'suspended') return u.status === 'suspended'
    return u.role === filter
  })

  const handleSuspend = async () => {
    if (!banModal || !banReason.trim()) {
      toast.showWarning('Please provide a reason.')
      return
    }
    setActionLoading(banModal.uid)
    try {
      await updateUserStatus(banModal.uid, 'suspended')
      await createNotification({
        userId: banModal.uid,
        message: `Your account has been suspended. Reason: ${banReason}`,
        type: 'system'
      })

      // Push notification to the suspended user
      sendPushToUser(
        banModal.uid,
        'Account Suspended',
        `Your account has been suspended. Reason: ${banReason}`,
        '/notifications'
      ).catch(err => console.warn('Push to suspended user failed:', err))

      await createAuditLog({
        actionType: 'user_suspended',
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Admin',
        newValue: `${banModal.name} suspended: ${banReason}`,
      })
      setBanModal(null)
      setBanReason('')
      await fetchUsers()
    } catch (err) {
      toast.showError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (user) => {
    setActionLoading(user.uid)
    try {
      await updateUserStatus(user.uid, 'active')
      await createNotification({
        userId: user.uid,
        message: 'Your account has been reactivated.',
        type: 'system'
      })

      // Push notification to the reactivated user
      sendPushToUser(
        user.uid,
        'Account Reactivated',
        'Your account has been reactivated. You can now access ReFound again.',
        '/notifications'
      ).catch(err => console.warn('Push to reactivated user failed:', err))

      await fetchUsers()
    } catch (err) {
      toast.showError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const roleBadge = {
    admin: { label: 'Admin', cls: 'au-badge-admin' },
    employee: { label: 'Employee', cls: 'au-badge-emp' },
    user: { label: 'Student', cls: 'au-badge-user' },
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <DashboardLayout pageTitle="Manage Users">
      <div className="au-controls">
        <select className="au-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="admin">Admins</option>
          <option value="employee">Employees</option>
          <option value="user">Students</option>
        </select>
        <span className="au-count">{filtered.length} users</span>
      </div>

      <div className="au-list">
        {loading ? (
          <div className="admin-empty">
            <span>👥</span>
            <p>No users found</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No users found</div>
        ) : (
          filtered.map(u => {
            const rb = roleBadge[u.role] || roleBadge.user
            const isSelf = u.uid === currentUser.uid
            return (
              <div className={`au-card ${u.status === 'suspended' ? 'au-card-suspended' : ''}`} key={u.uid}>
                <div className="au-card-left">
                  <div className="au-avatar">{(u.name || 'U').charAt(0).toUpperCase()}</div>
                  <div className="au-info">
                    <h3 className="au-name">{u.name || 'User'} {isSelf && <span className="au-you">(you)</span>}</h3>
                    <span className="au-email">{u.email}</span>
                    <div className="au-meta">
                      <span className={`au-role-badge ${rb.cls}`}>{rb.label}</span>
                      <span className="au-date">Joined {formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {!isSelf && (
                  <div className="au-actions">
                    {u.status === 'active' ? (
                      <button
                        className="au-btn-suspend"
                        onClick={() => setBanModal(u)}
                        disabled={actionLoading === u.uid}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        className="au-btn-reactivate"
                        onClick={() => handleReactivate(u)}
                        disabled={actionLoading === u.uid}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Ban reason modal */}
      {banModal && (
        <div className="au-modal-overlay" onClick={() => setBanModal(null)}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Suspend {banModal.name}?</h3>
            <p>This will prevent them from accessing the platform.</p>
            <textarea
              className="au-modal-reason"
              placeholder="Reason for suspension..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows="3"
            />
            <div className="au-modal-actions">
              <button className="au-modal-cancel" onClick={() => setBanModal(null)}>Cancel</button>
              <button className="au-modal-confirm" onClick={handleSuspend} disabled={actionLoading}>
                {actionLoading ? 'Suspending...' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default AdminUsers
