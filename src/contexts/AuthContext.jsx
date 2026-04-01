import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { subscribeToUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)

      // Clean up previous profile listener
      if (unsubProfile) {
        unsubProfile()
        unsubProfile = null
      }

      if (user) {
        // Subscribe to user profile in real-time
        unsubProfile = subscribeToUserProfile(user.uid, (profile) => {
          setUserProfile(profile)
          setLoading(false)
        })
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
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
