import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

// --- Status mapping ---

const STATUS_MAP = {
  'complete': 'completed',
  'done': 'completed',
  'finished': 'completed',
  '100%': 'completed',
  'in progress': 'in_progress',
  'active': 'in_progress',
  'started': 'in_progress',
  'not started': 'upcoming',
  'pending': 'upcoming',
  '0%': 'upcoming',
  'delayed': 'delayed',
  'late': 'delayed',
  'overdue': 'delayed',
  // Jira statuses
  'to do': 'upcoming',
  'open': 'upcoming',
  'backlog': 'upcoming',
  'selected for development': 'upcoming',
  'in development': 'in_progress',
  'in review': 'in_progress',
  'code review': 'in_progress',
  'testing': 'in_progress',
  'qa': 'in_progress',
  'closed': 'completed',
  'resolved': 'completed',
  'blocked': 'delayed',
  'on hold': 'delayed',
};

function mapStatus(raw) {
  if (!raw) return 'upcoming';
  const normalized = String(raw).trim().toLowerCase();
  return STATUS_MAP[normalized] || normalized;
}

/**
 * Map % complete (Smartsheet) to status
 */
function pctToStatus(pct) {
  const num = parseFloat(pct);
  if (isNaN(num)) return 'upcoming';
  if (num >= 100) return 'completed';
  if (num > 0) return 'in_progress';
  return 'upcoming';
}

// --- Column name resolution ---

const COLUMN_ALIASES = {
  name: ['name', 'task name', 'milestone', 'title', 'summary'],
  issueKey: ['issue key', 'issue id', 'key'],
  dueDate: ['due date', 'due_date', 'duedate', 'finish date', 'target date'],
  completedDate: ['completed date', 'completed_date', 'actual finish', 'resolved', 'resolution date'],
  status: ['status', '% complete', 'percent complete'],
  notes: ['notes', 'comments', 'description'],
  assignees: ['assigned to', 'assignee', 'owner', 'resource'],
  predecessors: ['predecessors', 'predecessor', 'depends on', 'dependencies', 'inward issue link (blocks)'],
};

const KPI_COLUMN_ALIASES = {
  kpi_name: ['kpi_name', 'name', 'metric'],
  date: ['date', 'reading_date', 'period'],
  value: ['value', 'actual', 'reading'],
  note: ['note', 'notes', 'comment'],
};

function resolveColumns(headers, aliasMap) {
  const mapping = {};
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

  for (const [field, aliases] of Object.entries(aliasMap)) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias);
      if (idx !== -1) {
        mapping[field] = headers[idx]; // Use original header name
        break;
      }
    }
  }
  return mapping;
}

// --- Date parsing ---

const MONTH_ABBREV = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // ISO 8601: YYYY-MM-DD (with optional time portion, e.g. Jira's 2026-06-01T10:00:00.000+0000)
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})([T ]|$)/);
  if (isoMatch) return isoMatch[1];
  // US format: MM/DD/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // Jira CSV format: DD/Mon/YY or DD/Mon/YYYY (e.g. "01/Jun/26 3:25 PM")
  const jiraMatch = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})/);
  if (jiraMatch) {
    const [, dd, mon, yy] = jiraMatch;
    const mm = MONTH_ABBREV[mon.toLowerCase()];
    if (mm) {
      const yyyy = yy.length === 2 ? `20${yy}` : yy;
      return `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
    }
  }
  // Try native Date parsing as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

// --- Assignee parsing ---

function parseAssignees(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// --- Predecessor parsing ---

function parsePredecessors(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// --- Import profiles ---

/**
 * Generic CSV profile: standard column mapping, name-based predecessors
 */
function parseGenericCsv(rows, columnMapping, isSmartsheet = false) {
  const milestones = [];
  const warnings = [];

  rows.forEach((row, rowIdx) => {
    const name = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
    if (!name) {
      warnings.push(`Row ${rowIdx + 2}: missing milestone name, skipped`);
      return;
    }

    let status;
    const statusCol = columnMapping.status;
    if (statusCol) {
      const rawStatus = String(row[statusCol] || '').trim();
      // Check if this is a % complete column
      const headerLower = statusCol.toLowerCase();
      if (headerLower.includes('% complete') || headerLower.includes('percent complete')) {
        status = pctToStatus(rawStatus);
      } else if (isSmartsheet && /^\d+%?$/.test(rawStatus.replace('%', ''))) {
        status = pctToStatus(rawStatus);
      } else {
        status = mapStatus(rawStatus);
      }
    } else {
      status = 'upcoming';
    }

    const ms = {
      id: uuidv4(),
      name,
      externalKey: columnMapping.issueKey ? String(row[columnMapping.issueKey] || '').trim() : '',
      dueDate: columnMapping.dueDate ? parseDate(row[columnMapping.dueDate]) : null,
      completedDate: columnMapping.completedDate ? parseDate(row[columnMapping.completedDate]) : null,
      status,
      notes: columnMapping.notes ? String(row[columnMapping.notes] || '').trim() : '',
      assignees: columnMapping.assignees ? parseAssignees(row[columnMapping.assignees]) : [],
      predecessorNames: columnMapping.predecessors ? parsePredecessors(row[columnMapping.predecessors]) : [],
      predecessorIds: [],
      isBlocked: false,
      notInLatestImport: false,
      lastImportedAt: new Date().toISOString(),
      archivedAt: null,
      _rowIndex: rowIdx, // Used for Smartsheet row-number resolution
    };

    // Auto-set status to completed if completedDate is present and status is not explicit
    if (ms.completedDate && ms.status !== 'completed') {
      ms.status = 'completed';
    }

    milestones.push(ms);
  });

  return { milestones, warnings };
}

/**
 * Resolve predecessors by name and optionally by row number (Smartsheet).
 */
function resolvePredecessors(milestones, useRowNumbers = false) {
  const warnings = [];
  const nameIndex = {};
  milestones.forEach(m => {
    nameIndex[m.name.toLowerCase()] = m.id;
    // Also index by external key (e.g. Jira issue key) since links reference keys
    if (m.externalKey) nameIndex[m.externalKey.toLowerCase()] = m.id;
  });

  milestones.forEach(m => {
    const resolvedIds = [];
    m.predecessorNames.forEach(pred => {
      // Try name-based resolution first
      const byName = nameIndex[pred.toLowerCase()];
      if (byName) {
        resolvedIds.push(byName);
        return;
      }

      // Try row-number resolution (Smartsheet)
      if (useRowNumbers && /^\d+$/.test(pred.trim())) {
        const rowNum = parseInt(pred.trim(), 10);
        // Row numbers in Smartsheet are 1-based; our array is 0-based
        const target = milestones.find(m2 => m2._rowIndex === rowNum - 1);
        if (target) {
          resolvedIds.push(target.id);
          return;
        }
      }

      warnings.push(`Unresolved predecessor "${pred}" for milestone "${m.name}"`);
    });

    m.predecessorIds = resolvedIds;
  });

  // Compute isBlocked
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 86400000);

  milestones.forEach(m => {
    if (m.predecessorIds.length === 0) {
      m.isBlocked = false;
      return;
    }

    const hasIncompletePredecessor = m.predecessorIds.some(predId => {
      const pred = milestones.find(p => p.id === predId);
      return pred && pred.status !== 'completed';
    });

    if (!hasIncompletePredecessor) {
      m.isBlocked = false;
      return;
    }

    // Blocked if due date is within 7 days or already past
    if (m.dueDate) {
      const due = new Date(m.dueDate + 'T00:00:00');
      m.isBlocked = due <= sevenDaysFromNow;
    } else {
      m.isBlocked = false;
    }
  });

  // Clean up internal _rowIndex
  milestones.forEach(m => delete m._rowIndex);

  return warnings;
}

// --- Main parse function ---

/**
 * Parse an import file (CSV or JSON) using the specified profile.
 *
 * @param {File} file - The uploaded file
 * @param {string} profile - 'generic' | 'smartsheet' | 'jira' | 'kpi_history'
 * @returns {Promise<{milestones?: Array, kpiEntries?: Array, warnings: string[], errors: string[]}>}
 */
export async function parseImportFile(file, profile = 'generic') {
  const ext = file.name.split('.').pop().toLowerCase();
  const errors = [];

  if (ext === 'json') {
    return parseJsonFile(file, profile);
  }

  if (ext !== 'csv') {
    return { milestones: [], warnings: [], errors: [`Unsupported file type: .${ext}`] };
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          results.errors.forEach(e => errors.push(`CSV parse error row ${e.row}: ${e.message}`));
        }

        if (profile === 'kpi_history') {
          resolve(parseKpiHistoryCsv(results.data, results.meta.fields || []));
          return;
        }

        const columnMapping = resolveColumns(results.meta.fields || [], COLUMN_ALIASES);

        if (!columnMapping.name) {
          resolve({
            milestones: [],
            warnings: [],
            errors: ['Could not find a name/title column. Expected columns: name, task name, milestone, or title'],
          });
          return;
        }

        const isSmartsheet = profile === 'smartsheet';
        const { milestones, warnings } = parseGenericCsv(results.data, columnMapping, isSmartsheet);

        const predWarnings = resolvePredecessors(milestones, isSmartsheet);
        warnings.push(...predWarnings);
        warnings.push(...errors);

        resolve({ milestones, warnings, errors: [] });
      },
      error: (err) => {
        resolve({ milestones: [], warnings: [], errors: [`Failed to parse CSV: ${err.message}`] });
      },
    });
  });
}

/**
 * Parse JSON import file
 */
async function parseJsonFile(file, profile) {
  try {
    const text = await file.text();
    let data = JSON.parse(text);

    if (profile === 'kpi_history') {
      // KPI history JSON
      if (!Array.isArray(data)) {
        return { kpiEntries: [], warnings: [], errors: ['Expected a JSON array of KPI history entries'] };
      }
      const entries = data.map(row => ({
        kpiName: row.kpi_name || row.name || row.metric || '',
        date: row.date || row.reading_date || row.period || '',
        value: parseFloat(row.value || row.actual || row.reading || 0),
        note: row.note || row.notes || row.comment || null,
      }));
      return { kpiEntries: entries, warnings: [], errors: [] };
    }

    // Jira REST API export: {issues: [{key, fields: {...}}]} (or a bare array of issues)
    const jiraIssues = Array.isArray(data?.issues) ? data.issues
      : (Array.isArray(data) && data.length > 0 && data.every(it => it && it.fields) ? data : null);
    if (profile === 'jira' || jiraIssues) {
      if (!jiraIssues) {
        return { milestones: [], warnings: [], errors: ['Could not find an "issues" array in the Jira JSON file'] };
      }
      return parseJiraIssues(jiraIssues);
    }

    // Milestone JSON - find the array
    if (!Array.isArray(data)) {
      // Look for nested array (Smartsheet envelope)
      const found = findArray(data);
      if (!found) {
        return { milestones: [], warnings: [], errors: ['Could not find a milestone array in the JSON file'] };
      }
      data = found;
    }

    const warnings = [];
    const milestones = data.map((item, idx) => {
      const name = item.name || item.title || item['task name'] || '';
      if (!name) {
        warnings.push(`Item ${idx + 1}: missing name, skipped`);
        return null;
      }

      return {
        id: uuidv4(),
        name,
        dueDate: parseDate(item.dueDate || item.due_date),
        completedDate: parseDate(item.completedDate || item.completed_date),
        status: mapStatus(item.status),
        notes: item.notes || item.description || '',
        assignees: Array.isArray(item.assignees) ? item.assignees : parseAssignees(item.assignees),
        predecessorNames: Array.isArray(item.predecessors) ? item.predecessors : parsePredecessors(item.predecessors),
        predecessorIds: [],
        isBlocked: false,
        notInLatestImport: false,
        lastImportedAt: new Date().toISOString(),
        archivedAt: null,
      };
    }).filter(Boolean);

    const predWarnings = resolvePredecessors(milestones, false);
    warnings.push(...predWarnings);

    return { milestones, warnings, errors: [] };
  } catch (e) {
    return { milestones: [], warnings: [], errors: [`Failed to parse JSON: ${e.message}`] };
  }
}

/**
 * Extract plain text from a Jira description, which may be a plain string
 * (REST API v2) or an Atlassian Document Format object (REST API v3).
 */
function jiraDescriptionText(desc) {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object') {
    const parts = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.text === 'string') parts.push(node.text);
      (node.content || []).forEach(walk);
    };
    walk(desc);
    return parts.join(' ').trim();
  }
  return '';
}

/**
 * Map a Jira status to a milestone status, falling back to the
 * status category (new/indeterminate/done) when the name is unrecognized.
 */
function mapJiraStatus(statusName, categoryKey) {
  const normalized = String(statusName || '').trim().toLowerCase();
  if (STATUS_MAP[normalized]) return STATUS_MAP[normalized];
  if (categoryKey === 'done') return 'completed';
  if (categoryKey === 'indeterminate') return 'in_progress';
  return 'upcoming';
}

/**
 * Parse Jira REST API issues into milestones.
 * "Blocks" issue links become predecessors (this issue is blocked by inwardIssue).
 */
function parseJiraIssues(issues) {
  const warnings = [];
  const milestones = issues.map((issue, idx) => {
    const f = issue.fields || {};
    const name = String(f.summary || '').trim();
    if (!name) {
      warnings.push(`Issue ${issue.key || `#${idx + 1}`}: missing summary, skipped`);
      return null;
    }

    const blockedBy = (f.issuelinks || [])
      .filter(link => link.inwardIssue && (link.type?.name === 'Blocks' || link.type?.inward === 'is blocked by'))
      .map(link => link.inwardIssue.key)
      .filter(Boolean);

    return {
      id: uuidv4(),
      name,
      externalKey: issue.key || '',
      dueDate: parseDate(f.duedate),
      completedDate: parseDate(f.resolutiondate),
      status: mapJiraStatus(f.status?.name, f.status?.statusCategory?.key),
      notes: jiraDescriptionText(f.description),
      assignees: f.assignee?.displayName ? [f.assignee.displayName] : [],
      predecessorNames: blockedBy,
      predecessorIds: [],
      isBlocked: false,
      notInLatestImport: false,
      lastImportedAt: new Date().toISOString(),
      archivedAt: null,
    };
  }).filter(Boolean);

  const predWarnings = resolvePredecessors(milestones, false);
  warnings.push(...predWarnings);

  return { milestones, warnings, errors: [] };
}

/**
 * Recursively find an array in a nested JSON object
 */
function findArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    // Check common keys first
    for (const key of ['rows', 'data', 'milestones', 'items', 'tasks']) {
      if (Array.isArray(obj[key])) return obj[key];
    }
    for (const key of Object.keys(obj)) {
      const result = findArray(obj[key]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Parse KPI history CSV
 */
function parseKpiHistoryCsv(rows, headers) {
  const columnMapping = resolveColumns(headers, KPI_COLUMN_ALIASES);
  const warnings = [];
  const errors = [];

  if (!columnMapping.kpi_name || !columnMapping.date || !columnMapping.value) {
    return {
      kpiEntries: [],
      warnings: [],
      errors: ['Missing required columns. Expected: kpi_name (or name/metric), date (or reading_date/period), value (or actual/reading)'],
    };
  }

  const kpiEntries = [];
  rows.forEach((row, idx) => {
    const kpiName = String(row[columnMapping.kpi_name] || '').trim();
    const date = parseDate(row[columnMapping.date]);
    const rawValue = row[columnMapping.value];
    const value = parseFloat(rawValue);

    if (!kpiName) {
      warnings.push(`Row ${idx + 2}: missing KPI name, skipped`);
      return;
    }
    if (!date) {
      warnings.push(`Row ${idx + 2}: invalid date, skipped`);
      return;
    }
    if (isNaN(value)) {
      warnings.push(`Row ${idx + 2}: invalid value "${rawValue}", skipped`);
      return;
    }

    kpiEntries.push({
      kpiName,
      date,
      value,
      note: columnMapping.note ? String(row[columnMapping.note] || '').trim() || null : null,
    });
  });

  return { kpiEntries, warnings, errors };
}

// --- Diff computation ---

/**
 * Compute the diff between existing and incoming milestones.
 * Match by name (case-insensitive).
 *
 * @param {Array} existing - Current milestones for this project
 * @param {Array} incoming - Parsed milestones from the import file
 * @returns {{ updated: Array, added: Array, notInFile: Array }}
 */
export function computeImportDiff(existing, incoming) {
  const existingByName = {};
  existing.forEach(m => {
    if (!m.archivedAt) {
      existingByName[m.name.toLowerCase()] = m;
    }
  });

  const incomingNames = new Set(incoming.map(m => m.name.toLowerCase()));

  const updated = [];
  const added = [];

  incoming.forEach(m => {
    const match = existingByName[m.name.toLowerCase()];
    if (match) {
      updated.push({ existing: match, incoming: m });
    } else {
      added.push(m);
    }
  });

  const notInFile = existing.filter(m => {
    if (m.archivedAt) return false;
    return !incomingNames.has(m.name.toLowerCase());
  });

  return { updated, added, notInFile };
}

/**
 * Apply an import diff, producing the merged milestone array.
 * Updated milestones get new field values; added milestones get projectId set.
 * Not-in-file milestones get notInLatestImport flag set.
 *
 * @param {string} projectId
 * @param {Array} existing - All current milestones for this project (including archived)
 * @param {{ updated: Array, added: Array, notInFile: Array }} diff
 * @returns {Array} Merged milestone array
 */
export function applyImport(projectId, existing, diff) {
  const result = [];
  const now = new Date().toISOString();
  const updatedIds = new Set(diff.updated.map(u => u.existing.id));
  const notInFileIds = new Set(diff.notInFile.map(m => m.id));

  // Process existing milestones
  existing.forEach(m => {
    if (updatedIds.has(m.id)) {
      const match = diff.updated.find(u => u.existing.id === m.id);
      result.push({
        ...m,
        externalKey: match.incoming.externalKey || m.externalKey,
        dueDate: match.incoming.dueDate ?? m.dueDate,
        completedDate: match.incoming.completedDate ?? m.completedDate,
        status: match.incoming.status || m.status,
        notes: match.incoming.notes || m.notes,
        assignees: match.incoming.assignees.length > 0 ? match.incoming.assignees : m.assignees,
        predecessorNames: match.incoming.predecessorNames.length > 0 ? match.incoming.predecessorNames : m.predecessorNames,
        predecessorIds: match.incoming.predecessorIds.length > 0 ? match.incoming.predecessorIds : m.predecessorIds,
        isBlocked: match.incoming.isBlocked,
        notInLatestImport: false,
        lastImportedAt: now,
      });
    } else if (notInFileIds.has(m.id)) {
      result.push({
        ...m,
        notInLatestImport: true,
      });
    } else {
      // Archived milestone — keep as-is
      result.push(m);
    }
  });

  // Add new milestones
  diff.added.forEach(m => {
    result.push({
      ...m,
      projectId,
      lastImportedAt: now,
    });
  });

  return result;
}
