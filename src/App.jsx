import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import StudentRoute from './components/StudentRoute'

// Public pages
import SplashScreen from './pages/SplashScreen'
import LoginScreen from './pages/LoginScreen'
import SignUpScreen from './pages/SignUpScreen'

// User (all roles) pages
import DashboardScreen from './pages/DashboardScreen'
import MyClaimsScreen from './pages/MyClaimsScreen'
import NotificationsScreen from './pages/NotificationsScreen'
import SettingsScreen from './pages/SettingsScreen'

// Employee pages
import EmpDashboard from './pages/emp/EmpDashboard'
import ReportItem from './pages/emp/ReportItem'
import ReviewClaims from './pages/emp/ReviewClaims'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminItems from './pages/admin/AdminItems'
import AdminClaims from './pages/admin/AdminClaims'
import AdminUsers from './pages/admin/AdminUsers'
import AdminActivity from './pages/admin/AdminActivity'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignUpScreen />} />

      {/* Protected routes – students and admins only (NOT employees) */}
      <Route path="/dashboard" element={
        <ProtectedRoute><StudentRoute><DashboardScreen /></StudentRoute></ProtectedRoute>
      } />
      <Route path="/my-claims" element={
        <ProtectedRoute><StudentRoute><MyClaimsScreen /></StudentRoute></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><NotificationsScreen /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><SettingsScreen /></ProtectedRoute>
      } />

      {/* Employee routes */}
      <Route path="/emp/dashboard" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['employee', 'admin']}>
            <EmpDashboard />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/emp/report-item" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['employee', 'admin']}>
            <ReportItem />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/emp/review-claims" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['employee', 'admin']}>
            <ReviewClaims />
          </RoleRoute>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/admin/items" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['admin']}>
            <AdminItems />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/admin/claims" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['admin']}>
            <AdminClaims />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['admin']}>
            <AdminUsers />
          </RoleRoute>
        </ProtectedRoute>
      } />
      <Route path="/admin/activity" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['admin']}>
            <AdminActivity />
          </RoleRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
