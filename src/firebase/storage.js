import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

/**
 * Upload an item image to Firebase Storage and return the download URL.
 */
export async function uploadItemImage(file, itemId) {
  const storageRef = ref(storage, `items/${itemId}/${file.name}`)
  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return url
}
