import { useState, useEffect } from 'react'
import { subscribeToAuditLogs } from '../../firebase/firestore'
import DashboardLayout from '../../components/DashboardLayout'
import './AdminActivity.css'

const actionLabels = {
  create_item: '📦 Item Created',
  claim_approved: '✅ Claim Approved',
  claim_rejected: '❌ Claim Rejected',
  claim_set_pending: '⏳ Claim Set Pending',
  promotion_approved: '⬆️ Promotion Approved',
  user_suspended: '🚫 User Suspended',
}

function AdminActivity() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const unsub = subscribeToAuditLogs((data) => {
      setLogs(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.actionType === filter)

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const actionTypes = [...new Set(logs.map(l => l.actionType))]

  return (
    <DashboardLayout pageTitle="Activity Log">
      <div className="al-controls">
        <select className="al-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Actions</option>
          {actionTypes.map(t => (
            <option key={t} value={t}>{actionLabels[t] || t}</option>
          ))}
        </select>
        <span className="al-count">{filtered.length} entries</span>
      </div>

      <div className="al-list">
        {loading ? (
          <div className="admin-empty">Loading activity log...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No activity yet</div>
        ) : (
          filtered.map(log => (
            <div className="al-card" key={log.id}>
              <div className="al-card-header">
                <span className="al-action-label">{actionLabels[log.actionType] || log.actionType}</span>
                <span className="al-card-time">{formatDate(log.timestamp)}</span>
              </div>
              <span className="al-card-performer">by {log.performedByName || 'Unknown'}</span>
              {log.newValue && <p className="al-card-detail">{log.previousValue ? `${log.previousValue} → ${log.newValue}` : log.newValue}</p>}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminActivity
