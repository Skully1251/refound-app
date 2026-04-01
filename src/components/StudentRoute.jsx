import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Redirects employees to /emp/dashboard and admins to /admin/dashboard.
 * Only allows students through.
 * Must be used inside a ProtectedRoute (user is guaranteed logged in).
 */
function StudentRoute({ children }) {
  const { isEmployee, isAdmin, loading } = useAuth()

  if (loading) return null

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (isEmployee) {
    return <Navigate to="/emp/dashboard" replace />
  }

  return children
}

export default StudentRoute
