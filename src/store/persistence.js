// Handles reading/writing tpm-data.json via File System Access API
// Falls back to localStorage if File System Access API is unavailable

const LOCAL_STORAGE_KEY = 'tpm-portal-data';
const DATA_FILE_NAME = 'tpm-data.json';

let directoryHandle = null;

export function isFileSystemAvailable() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function hasStoredHandle() {
  return directoryHandle !== null || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tpm-portal-has-handle') === 'true');
}

/**
 * Open the folder picker and read tpm-data.json if present.
 *
 * @returns {Promise<{status: 'ok'|'cancelled'|'unsupported', data: Object|null}>}
 *   status 'ok' with data:null means the folder is connected but empty —
 *   callers must keep the current state, NOT treat it as a reset.
 */
export async function openFolder() {
  if (!isFileSystemAvailable()) {
    return { status: 'unsupported', data: readFromLocalStorage() };
  }

  try {
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    sessionStorage.setItem('tpm-portal-has-handle', 'true');

    // Try to read existing tpm-data.json
    try {
      const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return { status: 'ok', data: JSON.parse(text) };
    } catch (e) {
      // File doesn't exist yet — that's fine
      if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') {
        return { status: 'ok', data: null };
      }
      // JSON parse error
      if (e instanceof SyntaxError) {
        console.error('Failed to parse tpm-data.json:', e);
        return { status: 'ok', data: null };
      }
      throw e;
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // User cancelled the picker
      return { status: 'cancelled', data: null };
    }
    console.error('Failed to open folder:', e);
    throw e;
  }
}

export async function readData() {
  if (!directoryHandle) {
    // Fall back to localStorage
    return readFromLocalStorage();
  }

  try {
    const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (e) {
    if (e.name === 'NotFoundError') {
      return null;
    }
    console.error('Failed to read tpm-data.json:', e);
    return null;
  }
}

export async function writeData(data) {
  // Always mirror to localStorage first, synchronously. The folder handle
  // does not survive a page reload, so the app boots from localStorage —
  // without this mirror, data saved while a folder was connected would be
  // invisible on the next start. Sync also means it lands during unload.
  try {
    writeToLocalStorage(data);
  } catch (e) {
    console.error('localStorage mirror failed:', e);
  }

  if (!directoryHandle) return;

  try {
    const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    const json = JSON.stringify(data);
    await writable.write(json);
    await writable.close();
  } catch (e) {
    console.error('Failed to write tpm-data.json:', e);
    throw e;
  }
}

// --- localStorage fallback helpers ---

function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    return null;
  }
}

function writeToLocalStorage(data) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(LOCAL_STORAGE_KEY, json);
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
    throw e;
  }
}
