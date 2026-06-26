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

export async function openFolder() {
  if (!isFileSystemAvailable()) {
    // Fall back to localStorage
    return readFromLocalStorage();
  }

  try {
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    sessionStorage.setItem('tpm-portal-has-handle', 'true');

    // Try to read existing tpm-data.json
    try {
      const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      // File doesn't exist yet — that's fine
      if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') {
        return null;
      }
      // JSON parse error
      if (e instanceof SyntaxError) {
        console.error('Failed to parse tpm-data.json:', e);
        return null;
      }
      throw e;
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // User cancelled the picker
      return null;
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
  if (!directoryHandle) {
    // Fall back to localStorage
    writeToLocalStorage(data);
    return;
  }

  try {
    const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    const json = JSON.stringify(data, null, 2);
    await writable.write(json);
    await writable.close();
  } catch (e) {
    console.error('Failed to write tpm-data.json:', e);
    // Attempt localStorage fallback on write failure
    try {
      writeToLocalStorage(data);
      console.warn('Fell back to localStorage for write');
    } catch (fallbackError) {
      console.error('localStorage fallback also failed:', fallbackError);
    }
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
