// Per-project linked folder handles, persisted in IndexedDB.
// FileSystemDirectoryHandle objects are structured-cloneable, so they can be
// stored in IndexedDB directly — but NOT serialized into tpm-data.json.

const DB_NAME = 'tpm-folder-handles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

export function isFolderAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Open the directory picker for linking a project folder (read-only access).
 * Returns null if the user cancels.
 */
export async function pickProjectFolder() {
  try {
    return await window.showDirectoryPicker({ mode: 'read' });
  } catch (e) {
    if (e.name === 'AbortError') return null;
    throw e;
  }
}

export async function saveFolderHandle(projectId, handle) {
  return withStore('readwrite', (store) => store.put(handle, projectId));
}

export async function getFolderHandle(projectId) {
  try {
    const handle = await withStore('readonly', (store) => store.get(projectId));
    return handle || null;
  } catch (e) {
    console.error('Failed to read folder handle from IndexedDB:', e);
    return null;
  }
}

export async function removeFolderHandle(projectId) {
  return withStore('readwrite', (store) => store.delete(projectId));
}

/**
 * Check current permission on a stored handle without prompting.
 * Returns 'granted' | 'prompt' | 'denied'.
 */
export async function queryFolderPermission(handle) {
  try {
    return await handle.queryPermission({ mode: 'read' });
  } catch {
    // Handle may be stale/invalid (e.g. folder deleted)
    return 'denied';
  }
}

/**
 * Re-request permission on a stored handle. MUST be called from a user
 * gesture (click) — browsers reject silent permission prompts.
 * Returns true when granted.
 */
export async function requestFolderPermission(handle) {
  try {
    const result = await handle.requestPermission({ mode: 'read' });
    return result === 'granted';
  } catch {
    return false;
  }
}
