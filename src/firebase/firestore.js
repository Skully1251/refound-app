import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, runTransaction, limit
} from 'firebase/firestore'
import { db } from './config'

// ════════════════════════════════════════
// USERS
// ════════════════════════════════════════

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function updateUserStatus(uid, status) {
  await updateDoc(doc(db, 'users', uid), { status })
}

export function subscribeToUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ════════════════════════════════════════
// ITEMS
// ════════════════════════════════════════

export async function createItem(data) {
  const ref = await addDoc(collection(db, 'items'), {
    ...data,
    status: 'open',
    claimId: null,
    lockedBy: null,
    lockedAt: null,
    createdAt: serverTimestamp()
  })
  return ref.id
}

export async function getItemById(itemId) {
  const snap = await getDoc(doc(db, 'items', itemId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeToItems(callback) {
  const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('Items listener error:', error.message)
  })
}

export async function updateItemStatus(itemId, status, extra = {}) {
  await updateDoc(doc(db, 'items', itemId), { status, ...extra })
}

export async function lockItem(itemId, uid) {
  const itemRef = doc(db, 'items', itemId)
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(itemRef)
    if (!snap.exists()) throw new Error('Item not found')
    const data = snap.data()

    // Check if already locked by someone else
    if (data.lockedBy && data.lockedBy !== uid) {
      const lockedAt = data.lockedAt?.toDate()
      const elapsed = Date.now() - (lockedAt?.getTime() || 0)
      // Lock expires after 5 minutes
      if (elapsed < 5 * 60 * 1000) {
        throw new Error('Item is currently being reviewed by another employee')
      }
    }

    transaction.update(itemRef, {
      lockedBy: uid,
      lockedAt: serverTimestamp()
    })
  })
}

export async function unlockItem(itemId) {
  await updateDoc(doc(db, 'items', itemId), {
    lockedBy: null,
    lockedAt: null
  })
}

// ════════════════════════════════════════
// CLAIMS
// ════════════════════════════════════════

export async function createClaim(data) {
  const ref = await addDoc(collection(db, 'claims'), {
    ...data,
    status: 'pending',
    approvedBy: null,
    rejectionReason: null,
    decisionAt: null,
    createdAt: serverTimestamp()
  })
  return ref.id
}

export function subscribeToUserClaims(uid, callback) {
  const q = query(
    collection(db, 'claims'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('User claims listener error:', error.message)
  })
}

export function subscribeToAllClaims(callback) {
  const q = query(collection(db, 'claims'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('All claims listener error:', error.message)
  })
}

export function subscribeToItemClaims(itemId, callback) {
  const q = query(
    collection(db, 'claims'),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('Item claims listener error:', error.message)
  })
}

export async function updateClaimStatus(claimId, status, extra = {}) {
  await updateDoc(doc(db, 'claims', claimId), {
    status,
    decisionAt: serverTimestamp(),
    ...extra
  })
}

/**
 * Approve a claim using a transaction to prevent race conditions.
 * Rejects all other pending claims for the same item.
 */
export async function approveClaimTransaction(claimId, itemId, empUid) {
  const claimRef = doc(db, 'claims', claimId)
  const itemRef = doc(db, 'items', itemId)

  return runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef)
    if (!itemSnap.exists()) throw new Error('Item not found')

    const itemData = itemSnap.data()
    // Prevent multiple approvals
    if (itemData.status === 'returned') {
      throw new Error('This item has already been returned to its owner')
    }
    if (itemData.claimId) {
      throw new Error('Another claim has already been approved for this item')
    }

    // Approve this claim
    transaction.update(claimRef, {
      status: 'approved',
      approvedBy: empUid,
      decisionAt: serverTimestamp()
    })

    // Update item
    transaction.update(itemRef, {
      status: 'returned',
      claimId: claimId,
      lockedBy: null,
      lockedAt: null
    })
  })

  // After transaction: reject other pending claims (outside transaction for simplicity)
}

export async function rejectOtherPendingClaims(itemId, approvedClaimId) {
  const q = query(
    collection(db, 'claims'),
    where('itemId', '==', itemId),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  const promises = snap.docs
    .filter(d => d.id !== approvedClaimId)
    .map(d => updateDoc(d.ref, {
      status: 'rejected',
      rejectionReason: 'Another claim was approved for this item',
      decisionAt: serverTimestamp()
    }))
  await Promise.all(promises)
}

/**
 * Check if user has an existing claim for an item.
 * Returns the list of existing claims (may be empty).
 */
export async function getUserClaimsForItem(uid, itemId) {
  const q = query(
    collection(db, 'claims'),
    where('userId', '==', uid),
    where('itemId', '==', itemId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════

export async function createNotification(data) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    isRead: false,
    createdAt: serverTimestamp()
  })
}

/**
 * Get all users with role 'user' (students).
 */
export async function getAllStudentUsers() {
  const q = query(collection(db, 'users'), where('role', '==', 'user'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Send a notification to every student.
 */
export async function notifyAllStudents(message, type = 'new_item') {
  const students = await getAllStudentUsers()
  const promises = students.map(student =>
    addDoc(collection(db, 'notifications'), {
      userId: student.id,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp()
    })
  )
  await Promise.all(promises)
}

export function subscribeToUserNotifications(uid, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('Notifications listener error:', error.message)
  })
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { isRead: true })
}

export async function markAllNotificationsRead(uid) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('isRead', '==', false)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isRead: true })))
}

// ════════════════════════════════════════
// PROMOTION REQUESTS
// ════════════════════════════════════════

export async function createPromotionRequest(uid, name, email) {
  await addDoc(collection(db, 'promotion_requests'), {
    userId: uid,
    userName: name,
    userEmail: email,
    status: 'pending',
    createdAt: serverTimestamp()
  })
}

export async function hasPendingPromotion(uid) {
  const q = query(
    collection(db, 'promotion_requests'),
    where('userId', '==', uid),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export function subscribeToPendingPromotions(callback) {
  const q = query(
    collection(db, 'promotion_requests'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(all.filter(req => req.status === 'pending'))
  }, (error) => {
    // silently handle Firestore listener errors
    console.warn('Promotions listener error:', error.message)
  })
}

export async function updatePromotionStatus(requestId, status) {
  await updateDoc(doc(db, 'promotion_requests', requestId), {
    status,
    decidedAt: serverTimestamp()
  })
}

// ════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════

export async function createAuditLog(data) {
  await addDoc(collection(db, 'audit_logs'), {
    ...data,
    timestamp: serverTimestamp()
  })
}

export function subscribeToAuditLogs(callback) {
  const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.warn('Audit logs listener error:', error.message)
  })
}
