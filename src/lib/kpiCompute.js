/**
 * KPI formula engine — computed KPI templates.
 * Each function takes relevant data arrays and a formulaParams object,
 * returns a numeric value.
 */

/**
 * Filter milestones by assignee if specified in params.
 */
function filterByAssignee(milestones, params) {
  if (!params?.filterAssignee) return milestones;
  const assignee = params.filterAssignee.toLowerCase();
  return milestones.filter(m =>
    m.assignees && m.assignees.some(a => a.toLowerCase().includes(assignee))
  );
}

/**
 * milestone_completion_pct
 * Completed milestones / total milestones x 100
 * Params: filterAssignee, includeDelayed (include delayed in denominator, default true)
 */
export function milestoneCompletionPct(milestones, params = {}) {
  let filtered = filterByAssignee(milestones, params);

  // Exclude archived
  filtered = filtered.filter(m => !m.archivedAt);

  // Optionally exclude delayed from denominator
  if (params.includeDelayed === false) {
    filtered = filtered.filter(m => m.status !== 'delayed');
  }

  if (filtered.length === 0) return 0;

  const completed = filtered.filter(m => m.status === 'completed').length;
  return Math.round((completed / filtered.length) * 100 * 10) / 10;
}

/**
 * on_time_pct
 * Milestones completed by due date / total completed x 100
 * Params: gracePeriodDays (0-14, default 0), filterAssignee
 */
export function onTimePct(milestones, params = {}) {
  let filtered = filterByAssignee(milestones, params);
  filtered = filtered.filter(m => !m.archivedAt);

  const completed = filtered.filter(m => m.status === 'completed');
  if (completed.length === 0) return 100; // No completed milestones = 100% on time vacuously

  const graceDays = params.gracePeriodDays || 0;

  const onTime = completed.filter(m => {
    if (!m.dueDate) return true; // No due date = can't be late
    if (!m.completedDate) return true; // Completed but no date recorded = assume on time

    const due = new Date(m.dueDate + 'T00:00:00');
    const completed = new Date(m.completedDate + 'T00:00:00');
    const graceDate = new Date(due.getTime() + graceDays * 86400000);

    return completed <= graceDate;
  });

  return Math.round((onTime.length / completed.length) * 100 * 10) / 10;
}

/**
 * blocked_count
 * Count of milestones with blocked or delayed status
 * Params: filterAssignee
 */
export function blockedCount(milestones, params = {}) {
  let filtered = filterByAssignee(milestones, params);
  filtered = filtered.filter(m => !m.archivedAt);

  return filtered.filter(m => m.isBlocked || m.status === 'delayed').length;
}

/**
 * count
 * Count of items matching a filter
 * Params: countTarget ('milestones'|'goals'|'notes'), countStatus (status filter or 'any'), filterAssignee
 */
export function count(milestones, goals, notes, params = {}) {
  const target = params.countTarget || 'milestones';
  const statusFilter = params.countStatus || 'any';

  let items;
  switch (target) {
    case 'milestones':
      items = filterByAssignee(milestones, params).filter(m => !m.archivedAt);
      break;
    case 'goals':
      items = goals;
      break;
    case 'notes':
      items = notes;
      break;
    default:
      return 0;
  }

  if (statusFilter && statusFilter !== 'any' && statusFilter !== 'all') {
    items = items.filter(item => item.status === statusFilter);
  }

  return items.length;
}

/**
 * ratio
 * Count(numerator filter) / Count(denominator filter) x 100
 * Params: ratioNumeratorStatus, ratioDenominatorStatus, filterAssignee
 * Operates on milestones by default
 */
export function ratio(milestones, params = {}) {
  let filtered = filterByAssignee(milestones, params);
  filtered = filtered.filter(m => !m.archivedAt);

  const numStatus = params.ratioNumeratorStatus;
  const denStatus = params.ratioDenominatorStatus || 'all';

  const denominator = denStatus === 'all'
    ? filtered
    : filtered.filter(m => m.status === denStatus);

  if (denominator.length === 0) return 0;

  const numerator = numStatus === 'all'
    ? filtered
    : filtered.filter(m => m.status === numStatus);

  return Math.round((numerator.length / denominator.length) * 100 * 10) / 10;
}

/**
 * Main dispatcher: compute a KPI value from its template key and params.
 */
export function computeKpiValue(templateKey, milestones, goals, notes, params = {}) {
  switch (templateKey) {
    case 'milestone_completion_pct':
      return milestoneCompletionPct(milestones, params);
    case 'on_time_pct':
      return onTimePct(milestones, params);
    case 'blocked_count':
      return blockedCount(milestones, params);
    case 'count':
      return count(milestones, goals, notes, params);
    case 'ratio':
      return ratio(milestones, params);
    default:
      console.warn(`Unknown KPI template: ${templateKey}`);
      return null;
  }
}
