import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Role-based route guard.
 * Only allows access if user's role is in the allowedRoles array.
 * Must be used inside a ProtectedRoute (user is guaranteed logged in).
 */
function RoleRoute({ allowedRoles, children }) {
  const { userProfile, loading } = useAuth()

  if (loading) return null

  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RoleRoute
