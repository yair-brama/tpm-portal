// Plain-text extraction per file type.
// Text formats parse natively; binary formats (docx/pdf/xlsx/pptx)
// lazy-load their parser libraries so they stay out of the main bundle.

import Papa from 'papaparse';

export const SUPPORTED_EXTENSIONS = ['txt', 'md', 'csv', 'docx', 'pdf', 'xlsx', 'pptx'];

const PDF_MAX_PAGES = 50;

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
    case 'docx':
      return docxToText(file);
    case 'pdf':
      return pdfToText(file);
    case 'xlsx':
      return xlsxToText(file);
    case 'pptx':
      return pptxToText(file);
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

async function docxToText(file) {
  const mammoth = (await import('mammoth')).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(doc.numPages, PDF_MAX_PAGES);
  const parts = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => item.str).join(' '));
  }
  if (doc.numPages > pages) {
    parts.push(`[${doc.numPages - pages} more pages not extracted]`);
  }
  return parts.join('\n\n');
}

async function xlsxToText(file) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return `Sheet: ${name}\n${csvToText(csv)}`;
  }).join('\n\n');
}

// SheetJS does not parse PowerPoint files — unzip with JSZip and pull
// the text runs (<a:t>) out of each slide's XML instead.
const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

async function pptxToText(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  const parts = [];
  for (const path of slidePaths) {
    const xml = await zip.files[path].async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const runs = [...doc.getElementsByTagNameNS(DRAWINGML_NS, 't')].map((n) => n.textContent);
    const text = runs.join(' ').trim();
    if (text) parts.push(`Slide ${path.match(/\d+/)[0]}: ${text}`);
  }
  return parts.join('\n');
}
