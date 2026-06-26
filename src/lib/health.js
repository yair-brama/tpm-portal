/**
 * Compute suggested RAG status for a project based on milestone data.
 * Applied in order - first match wins.
 *
 * Rules:
 * 1. Any milestone is delayed AND past due date -> Red
 * 2. Target date within 14 days AND any milestone is upcoming/in_progress -> Amber
 * 3. > 30% of milestones are delayed -> Amber
 * 4. All milestones completed -> Green
 * 5. Default -> Green
 *
 * @param {Array} milestones - Active (non-archived) milestones for this project
 * @param {string|null} targetDate - Project target date (YYYY-MM-DD)
 * @returns {'green'|'amber'|'red'} Suggested RAG status
 */
export function computeSuggestedRag(milestones, targetDate) {
  const activeMilestones = milestones.filter(m => !m.archivedAt);

  if (activeMilestones.length === 0) return 'green';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Rule 1: Any milestone is delayed AND past due date -> Red
  const hasDelayedPastDue = activeMilestones.some(m => {
    if (m.status !== 'delayed') return false;
    if (!m.dueDate) return false;
    const due = new Date(m.dueDate + 'T00:00:00');
    return due < today;
  });
  if (hasDelayedPastDue) return 'red';

  // Rule 2: Target date within 14 days AND any milestone is upcoming/in_progress -> Amber
  if (targetDate) {
    const target = new Date(targetDate + 'T00:00:00');
    const daysToTarget = Math.ceil((target - today) / 86400000);
    if (daysToTarget <= 14 && daysToTarget >= 0) {
      const hasIncomplete = activeMilestones.some(
        m => m.status === 'upcoming' || m.status === 'in_progress'
      );
      if (hasIncomplete) return 'amber';
    }
  }

  // Rule 3: > 30% of milestones are delayed -> Amber
  const delayedCount = activeMilestones.filter(m => m.status === 'delayed').length;
  if (delayedCount / activeMilestones.length > 0.3) return 'amber';

  // Rule 4: All milestones completed -> Green
  const allCompleted = activeMilestones.every(m => m.status === 'completed');
  if (allCompleted) return 'green';

  // Rule 5: Default -> Green
  return 'green';
}
