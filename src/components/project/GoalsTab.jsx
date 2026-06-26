import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import Modal from '../shared/Modal';
import { goalStatusBg, goalStatusLabel, formatDate, daysUntil } from '../../lib/helpers';

const GOAL_STATUSES = ['not_started', 'in_progress', 'achieved', 'missed'];

export default function GoalsTab({ project }) {
  const allGoals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const goals = useMemo(() => allGoals.filter((g) => g.projectId === project.id), [allGoals, project.id]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', successMetric: '', dueDate: '' });

  const sorted = [...goals].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const achieved = goals.filter((g) => g.status === 'achieved').length;

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    addGoal({ ...form, projectId: project.id });
    setForm({ title: '', description: '', successMetric: '', dueDate: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Goals</h2>
          <p className="text-sm text-stone-500 mt-1">{achieved} of {goals.length} achieved</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">
          <Icon name="add" className="text-[16px]" />
          Add Goal
        </button>
      </div>

      {goals.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-stone-200">
            <div className="h-full bg-[#15803d] transition-all" style={{ width: `${Math.round((achieved / goals.length) * 100)}%` }} />
          </div>
          <span className="text-sm font-medium text-stone-600">{Math.round((achieved / goals.length) * 100)}%</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Icon name="flag" className="text-[48px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm">No goals defined yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((goal) => {
            const remaining = daysUntil(goal.dueDate);
            return (
              <div key={goal.id} className="border border-[#1a1a1a]/10 p-4 hover:border-[#1a1a1a]/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-[#1a1a1a]">{goal.title}</h3>
                    {goal.description && <p className="text-xs text-stone-500 mt-1">{goal.description}</p>}
                    {goal.successMetric && (
                      <p className="text-xs text-stone-400 mt-1">
                        <Icon name="check_circle" className="text-[14px] align-middle mr-1" />
                        Success: {goal.successMetric}
                      </p>
                    )}
                    {goal.dueDate && (
                      <p className={`text-xs mt-1 ${remaining !== null && remaining < 0 ? 'text-[#c41e3a]' : 'text-stone-400'}`}>
                        <Icon name="event" className="text-[14px] align-middle mr-1" />
                        Due {formatDate(goal.dueDate)}
                        {remaining !== null && remaining >= 0 && ` (${remaining} days)`}
                        {remaining !== null && remaining < 0 && ` (${Math.abs(remaining)} days overdue)`}
                      </p>
                    )}
                  </div>
                  <select
                    value={goal.status}
                    onChange={(e) => updateGoal(goal.id, { status: e.target.value })}
                    className={`text-xs px-2 py-1 border font-medium ${goalStatusBg(goal.status)} focus:outline-none`}
                  >
                    {GOAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{goalStatusLabel(s)}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Goal" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" autoFocus />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[#1a1a1a]/15 px-3 py-2 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Success Metric</label>
              <input type="text" value={form.successMetric} onChange={(e) => setForm({ ...form, successMetric: e.target.value })} placeholder="How will you know this goal is achieved?" className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSubmit} className="px-4 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Add Goal</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
