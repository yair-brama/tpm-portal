import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { statusLabel, formatDate, daysUntil } from '../../lib/helpers';

const STATUSES = ['on_track', 'at_risk', 'off_track', 'completed', 'on_hold'];
const PHASES = ['discovery', 'planning', 'execution', 'monitoring', 'closing'];

export default function OverviewTab({ project }) {
  const updateProject = useStore((s) => s.updateProject);
  const initDiscovery = useStore((s) => s.initDiscovery);
  const disc = useStore((s) => s.discoveryState[project.id] || null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(project.description || '');
  const [newStakeholder, setNewStakeholder] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    initDiscovery(project.id);
  }, [project.id, initDiscovery]);
  let discTotal = 0;
  let discChecked = 0;
  (disc || []).forEach((cat) => {
    cat.items.forEach((item) => {
      discTotal++;
      if (item.checked) discChecked++;
    });
  });
  const discPct = discTotal > 0 ? Math.round((discChecked / discTotal) * 100) : 0;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    const summary = `Project: ${project.name}\nStatus: ${statusLabel(project.status)}\nPhase: ${project.phase}\nOwner: ${project.owner || 'Not set'}\nStart: ${formatDate(project.startDate)}\nTarget: ${formatDate(project.targetDate)}\nDescription: ${project.description || 'N/A'}\nStakeholders: ${(project.stakeholders || []).join(', ') || 'None'}\nTags: ${(project.tags || []).join(', ') || 'None'}`;
    navigator.clipboard.writeText(summary);
  };

  const addStakeholder = () => {
    if (!newStakeholder.trim()) return;
    updateProject(project.id, {
      stakeholders: [...(project.stakeholders || []), newStakeholder.trim()],
    });
    setNewStakeholder('');
  };

  const removeStakeholder = (idx) => {
    const updated = [...(project.stakeholders || [])];
    updated.splice(idx, 1);
    updateProject(project.id, { stakeholders: updated });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    updateProject(project.id, {
      tags: [...(project.tags || []), newTag.trim()],
    });
    setNewTag('');
  };

  const removeTag = (idx) => {
    const updated = [...(project.tags || [])];
    updated.splice(idx, 1);
    updateProject(project.id, { tags: updated });
  };

  const remaining = daysUntil(project.targetDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-[#1a1a1a]">{project.name}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
          <span>
            <Icon name="person" className="text-[16px] align-middle mr-1" />
            {project.owner || 'No owner'}
          </span>
          <span>
            <Icon name="update" className="text-[16px] align-middle mr-1" />
            Updated {formatDate(project.updatedAt?.split('T')[0])}
          </span>
        </div>
      </div>

      {/* Status & Phase */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[#1a1a1a]/10 p-4">
          <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">
            Status
          </label>
          <select
            value={project.status}
            onChange={(e) => updateProject(project.id, { status: e.target.value })}
            className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="border border-[#1a1a1a]/10 p-4">
          <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">
            Phase
          </label>
          <select
            value={project.phase}
            onChange={(e) => updateProject(project.id, { phase: e.target.value })}
            className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="border border-[#1a1a1a]/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
            Description
          </label>
          {!editingDesc && (
            <button
              onClick={() => { setDescDraft(project.description || ''); setEditingDesc(true); }}
              className="text-xs text-[#c41e3a] hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        {editingDesc ? (
          <div>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={4}
              className="w-full border border-[#1a1a1a]/15 px-3 py-2 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { updateProject(project.id, { description: descDraft }); setEditingDesc(false); }}
                className="px-3 py-1 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80"
              >
                Save
              </button>
              <button onClick={() => setEditingDesc(false)} className="px-3 py-1 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-700 whitespace-pre-wrap">
            {project.description || 'No description set.'}
          </p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[#1a1a1a]/10 p-4">
          <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">Start Date</label>
          <input type="date" value={project.startDate || ''} onChange={(e) => updateProject(project.id, { startDate: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
        </div>
        <div className="border border-[#1a1a1a]/10 p-4">
          <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">Target Date</label>
          <input type="date" value={project.targetDate || ''} onChange={(e) => updateProject(project.id, { targetDate: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          {remaining !== null && (
            <p className={`text-xs mt-1 ${remaining < 0 ? 'text-[#c41e3a]' : remaining < 14 ? 'text-[#d97706]' : 'text-[#15803d]'}`}>
              {remaining < 0 ? `${Math.abs(remaining)} days overdue` : remaining === 0 ? 'Due today' : `${remaining} days remaining`}
            </p>
          )}
        </div>
      </div>

      {/* Stakeholders */}
      <div className="border border-[#1a1a1a]/10 p-4">
        <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">Stakeholders</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(project.stakeholders || []).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-100 border border-stone-200 text-stone-700">
              {s}
              <button onClick={() => removeStakeholder(i)} className="text-stone-400 hover:text-[#c41e3a]">
                <Icon name="close" className="text-[14px]" />
              </button>
            </span>
          ))}
          {(project.stakeholders || []).length === 0 && <span className="text-xs text-stone-400">No stakeholders added</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newStakeholder} onChange={(e) => setNewStakeholder(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStakeholder()} placeholder="Add stakeholder..." className="flex-1 border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          <button onClick={addStakeholder} className="px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Add</button>
        </div>
      </div>

      {/* Tags */}
      <div className="border border-[#1a1a1a]/10 p-4">
        <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(project.tags || []).map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[#c41e3a]/8 border border-[#c41e3a]/15 text-[#c41e3a]">
              {t}
              <button onClick={() => removeTag(i)} className="text-[#c41e3a]/60 hover:text-[#c41e3a]">
                <Icon name="close" className="text-[14px]" />
              </button>
            </span>
          ))}
          {(project.tags || []).length === 0 && <span className="text-xs text-stone-400">No tags added</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="Add tag..." className="flex-1 border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          <button onClick={addTag} className="px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Add</button>
        </div>
      </div>

      {/* Discovery Progress */}
      <div className="border border-[#1a1a1a]/10 p-4">
        <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-2">Discovery Progress</label>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-stone-200">
            <div className="h-full bg-[#15803d] transition-all" style={{ width: `${discPct}%` }} />
          </div>
          <span className="text-sm font-medium text-stone-600 w-12 text-right">{discPct}%</span>
        </div>
        <p className="text-xs text-stone-400 mt-1">{discChecked} of {discTotal} items complete</p>
      </div>

      {/* Project Data */}
      <div className="border border-[#1a1a1a]/10 p-4">
        <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-3">Project Data</label>
        <div className="flex gap-3">
          <button onClick={handleExportJson} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
            <Icon name="download" className="text-[16px]" />
            Export as JSON
          </button>
          <button onClick={handleCopySummary} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
            <Icon name="content_copy" className="text-[16px]" />
            Copy project summary
          </button>
        </div>
      </div>
    </div>
  );
}
