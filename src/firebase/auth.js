import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

const googleProvider = new GoogleAuthProvider()

// Pre-loaded admin emails (lowercase for comparison)
const ADMIN_EMAILS = [
  '2006negiom1505@gmail.com',
  'helpdesk@bennett.in'
]

/**
 * Determine role based on email
 */
function getRoleForEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
}

/**
 * Create user profile document in Firestore
 */
async function createUserProfile(uid, name, email) {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const role = getRoleForEmail(email)
    await setDoc(userRef, {
      uid,
      name,
      email: email.toLowerCase(),
      role,
      status: 'active',
      createdAt: serverTimestamp()
    })
    return role
  }
  return userSnap.data().role
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password, name) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(userCredential.user, { displayName: name })
  const role = await createUserProfile(userCredential.user.uid, name, email)
  return { user: userCredential.user, role }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  // Ensure profile exists
  const userRef = doc(db, 'users', userCredential.user.uid)
  const userSnap = await getDoc(userRef)
  const role = userSnap.exists() ? userSnap.data().role : 'user'
  return { user: userCredential.user, role }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const { user } = result
  const name = user.displayName || 'Google User'
  const email = user.email || ''
  const role = await createUserProfile(user.uid, name, email)
  return { user, role }
}

/**
 * Sign out
 */
export async function logOut() {
  await signOut(auth)
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}
