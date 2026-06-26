export const statusLabel = (s) =>
  ({ on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track', completed: 'Completed', on_hold: 'On Hold' }[s] || s);

export const statusColor = (s) =>
  ({ on_track: 'green', at_risk: 'amber', off_track: 'red', completed: 'green', on_hold: 'dark' }[s] || 'dark');

export const ragDot = (color) =>
  ({ green: 'bg-[#15803d]', amber: 'bg-[#d97706]', red: 'bg-[#c41e3a]' }[color] || 'bg-stone-400');

export const ragBg = (color) =>
  ({
    green: 'bg-[#f4fbf7] text-[#15803d] border-[#15803d]/15',
    amber: 'bg-[#fdfaf4] text-[#d97706] border-[#d97706]/20',
    red: 'bg-[#fdf5f5] text-[#c41e3a] border-[#c41e3a]/15',
  }[color] || 'bg-stone-100 text-stone-800 border-stone-200');

export const msStatusColor = (s) =>
  ({ completed: '#15803d', in_progress: '#1a1a1a', upcoming: '#a8a29e', delayed: '#c41e3a' }[s] || '#a8a29e');

export const msStatusBg = (s) =>
  ({
    completed: 'bg-[#f4fbf7] text-[#15803d] border-[#15803d]/15',
    in_progress: 'bg-[#fdfcfb] text-[#1a1a1a] border-[#1a1a1a]/20',
    upcoming: 'bg-stone-50 text-stone-500 border-stone-200',
    delayed: 'bg-[#fdf5f5] text-[#c41e3a] border-[#c41e3a]/15',
  }[s] || 'bg-stone-50 text-stone-500 border-stone-200');

export const goalStatusBg = (s) =>
  ({
    achieved: 'bg-[#f4fbf7] text-[#15803d] border-[#15803d]/15',
    in_progress: 'bg-[#fdfcfb] text-[#1a1a1a] border-[#1a1a1a]/20',
    not_started: 'bg-stone-50 text-stone-500 border-stone-200',
    missed: 'bg-[#fdf5f5] text-[#c41e3a] border-[#c41e3a]/15',
  }[s] || 'bg-stone-50 text-stone-500 border-stone-200');

export const goalStatusLabel = (s) =>
  ({ achieved: 'Achieved', in_progress: 'In Progress', not_started: 'Not Started', missed: 'Missed' }[s] || s);

export const msStatusLabel = (s) =>
  ({ completed: 'Completed', in_progress: 'In Progress', upcoming: 'Upcoming', delayed: 'Delayed' }[s] || s);

export const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
};

/**
 * Compute RAG status for a KPI based on its current value and thresholds.
 * Returns 'green' | 'amber' | 'red' | null (if no value or thresholds)
 */
export function kpiRag(kpi) {
  if (kpi.currentValue == null || !kpi.thresholds) return null;
  const { green, amber } = kpi.thresholds;
  const val = kpi.currentValue;

  if (kpi.direction === 'higher_is_better') {
    if (val >= green) return 'green';
    if (val >= amber) return 'amber';
    return 'red';
  } else {
    // lower_is_better — green threshold is the low end
    if (val <= green) return 'green';
    if (val <= amber) return 'amber';
    return 'red';
  }
}
