import { database } from './firebase';
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  DataSnapshot,
} from 'firebase/database';

/**
 * Write data ke database
 */
export async function writeData(path: string, data: any) {
  try {
    const dbRef = ref(database, path);
    await set(dbRef, data);
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
}

/**
 * Read data dari database (sekali)
 */
export async function readData(path: string) {
  try {
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

/**
 * Push data baru (auto-generated key)
 */
export async function pushData(path: string, data: any) {
  try {
    const dbRef = ref(database, path);
    const newRef = push(dbRef);
    await set(newRef, data);
    return newRef.key;
  } catch (error) {
    console.error('Error pushing data:', error);
    throw error;
  }
}

/**
 * Update data
 */
export async function updateData(path: string, updates: any) {
  try {
    const dbRef = ref(database, path);
    await update(dbRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
}

/**
 * Delete data
 */
export async function deleteData(path: string) {
  try {
    const dbRef = ref(database, path);
    await remove(dbRef);
    return true;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

/**
 * Listen to data changes (realtime)
 */
export function listenToData(
  path: string,
  callback: (snapshot: DataSnapshot) => void
) {
  const dbRef = ref(database, path);
  return onValue(dbRef, callback);
}

/**
 * Query data dengan filter
 */
export async function queryData(
  path: string,
  orderBy: string,
  value: any
) {
  try {
    const dbRef = ref(database, path);
    const q = query(dbRef, orderByChild(orderBy), equalTo(value));
    const snapshot = await get(q);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error querying data:', error);
    throw error;
  }
}
