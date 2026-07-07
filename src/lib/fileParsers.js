// Plain-text extraction per file type.
// Phase 1: txt / md / csv. Phase 2 (later): docx, pdf, xlsx, pptx.

import Papa from 'papaparse';

export const SUPPORTED_EXTENSIONS = ['txt', 'md', 'csv'];

export function fileExtension(fileName) {
  const idx = fileName.lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx + 1).toLowerCase();
}

export function isSupportedFile(fileName) {
  return SUPPORTED_EXTENSIONS.includes(fileExtension(fileName));
}

/**
 * Extract plain text from a File.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractText(file) {
  const ext = fileExtension(file.name);
  switch (ext) {
    case 'txt':
    case 'md':
      return file.text();
    case 'csv':
      return csvToText(await file.text());
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

/**
 * Render CSV as readable pipe-delimited lines so the LLM sees
 * column structure without needing to parse raw CSV quoting.
 */
function csvToText(raw) {
  const parsed = Papa.parse(raw, { skipEmptyLines: true });
  return parsed.data.map((row) => row.join(' | ')).join('\n');
}
