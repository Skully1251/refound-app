import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { subscribeToUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)

const LAST_ACTIVITY_KEY = 'refound_last_activity'
const SESSION_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const unsubProfileRef = useRef(null)

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
  }, [])

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up any existing profile listener first
      if (unsubProfileRef.current) {
        unsubProfileRef.current()
        unsubProfileRef.current = null
      }

      if (user) {
        // Check if the session has expired (3 days of inactivity)
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity, 10)
          if (elapsed > SESSION_TIMEOUT_MS) {
            // Expired — sign out and return
            localStorage.removeItem(LAST_ACTIVITY_KEY)
            setCurrentUser(null)
            setUserProfile(null)
            setLoading(false)
            signOut(auth) // fire-and-forget, will trigger onAuthStateChanged again with null
            return
          }
        }

        // Session is valid — record activity and continue
        setCurrentUser(user)
        updateLastActivity()

        // Subscribe to user profile in real-time
        unsubProfileRef.current = subscribeToUserProfile(user.uid, (profile) => {
          setUserProfile(profile)
          setLoading(false)
        })
      } else {
        setCurrentUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    // Track user activity to refresh the session timer
    const activityEvents = ['click', 'touchstart', 'keydown', 'scroll']
    const handleActivity = () => updateLastActivity()
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }))

    return () => {
      unsubAuth()
      if (unsubProfileRef.current) unsubProfileRef.current()
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity))
    }
  }, [])

  const isAdmin = userProfile?.role === 'admin'
  const isEmployee = userProfile?.role === 'employee'
  const isUser = userProfile?.role === 'user'
  const isSuspended = userProfile?.status === 'suspended'

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    isEmployee,
    isUser,
    isSuspended
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
