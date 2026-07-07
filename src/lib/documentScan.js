// Folder scanning with a two-tier change check:
// 1. metadata (size + lastModified) — cheap, every scan
// 2. SHA-256 content hash — only when metadata differs, to avoid
//    re-summarizing files whose mtime was touched without a content change

import { v4 as uuidv4 } from 'uuid';
import { isSupportedFile } from './fileParsers';

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Scan a linked project folder and diff it against stored document records.
 * Top-level files only (no recursion) in this phase.
 *
 * Does not mutate its inputs. Statuses: 'new' (needs summarization,
 * including changed files), 'summarized', 'removed' (no longer in folder).
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} projectId
 * @param {Array} existingDocs - Stored document records for this project
 * @returns {Promise<{documents: Array, counts: {added: number, changed: number, unchanged: number, removed: number, skipped: number}}>}
 */
export async function scanProjectFolder(dirHandle, projectId, existingDocs) {
  const existingByName = new Map((existingDocs || []).map((d) => [d.fileName, d]));
  const seen = new Set();
  const documents = [];
  const counts = { added: 0, changed: 0, unchanged: 0, removed: 0, skipped: 0 };
  const now = new Date().toISOString();

  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue;
    if (!isSupportedFile(entry.name)) {
      counts.skipped++;
      continue;
    }
    seen.add(entry.name);

    const file = await entry.getFile();
    const existing = existingByName.get(entry.name);

    // Tier 1: metadata fast path
    if (existing && existing.size === file.size && existing.lastModified === file.lastModified) {
      // A previously removed file that reappeared identical keeps its summary
      const status = existing.summary ? 'summarized' : 'new';
      documents.push(existing.status === status ? existing : { ...existing, status });
      counts.unchanged++;
      continue;
    }

    // Tier 2: content hash (file is read only when metadata differs)
    const contentHash = await sha256Hex(await file.arrayBuffer());

    if (existing && existing.contentHash === contentHash) {
      // False alarm (e.g. mtime touched) — refresh metadata so the fast
      // path passes next time, keep summary untouched
      documents.push({ ...existing, size: file.size, lastModified: file.lastModified });
      counts.unchanged++;
      continue;
    }

    if (existing) {
      // Content actually changed — queue for re-summarization
      documents.push({
        ...existing,
        size: file.size,
        lastModified: file.lastModified,
        contentHash,
        status: 'new',
        lastScannedAt: now,
      });
      counts.changed++;
    } else {
      documents.push({
        id: uuidv4(),
        projectId,
        fileName: entry.name,
        fileType: entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase(),
        size: file.size,
        lastModified: file.lastModified,
        contentHash,
        status: 'new',
        summary: null,
        extractedTextExcerpt: null,
        summarizedAt: null,
        lastScannedAt: now,
      });
      counts.added++;
    }
  }

  // Files in the store but no longer in the folder
  for (const doc of existingDocs || []) {
    if (!seen.has(doc.fileName)) {
      documents.push(doc.status === 'removed' ? doc : { ...doc, status: 'removed' });
      if (doc.status !== 'removed') counts.removed++;
    }
  }

  return { documents, counts };
}

/**
 * Read a document's file from the folder for summarization.
 * Returns null if the file is gone.
 */
export async function readDocumentFile(dirHandle, fileName) {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}
