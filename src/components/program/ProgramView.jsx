import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import KpisTab from '../project/KpisTab';
import { statusLabel, ragBg, kpiRag, formatDate } from '../../lib/helpers';

export default function ProgramView() {
  const program = useStore((s) => s.program);
  const updateProgram = useStore((s) => s.updateProgram);
  const projects = useStore((s) => s.projects);
  const milestones = useStore((s) => s.milestones);
  const kpis = useStore((s) => s.kpis);
  const programKpis = useMemo(() => kpis.filter(k => k.level === 'program'), [kpis]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(program.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(program.description);

  // Cross-project rollups
  const activeProjects = projects.filter((p) => p.status !== 'completed' && p.status !== 'on_hold');
  const projectsByRag = {
    green: activeProjects.filter((p) => p.status === 'on_track').length,
    amber: activeProjects.filter((p) => p.status === 'at_risk').length,
    red: activeProjects.filter((p) => p.status === 'off_track').length,
  };

  const activeMilestones = milestones.filter((m) => !m.archivedAt);
  const completedMs = activeMilestones.filter((m) => m.status === 'completed').length;
  const totalMs = activeMilestones.length;
  const msPct = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  const allKpis = [...kpis, ...programKpis];
  const kpisAtRisk = allKpis.filter((k) => kpiRag(k) === 'amber').length;
  const openBreaches = allKpis
    .filter((k) => k.type === 'sla')
    .reduce((acc, k) => acc + (k.breachLog || []).filter((b) => !b.resolved).length, 0);

  // Fake program project for KpisTab
  const programAsProject = { id: '__program__', name: program.name };

  return (
    <div className="space-y-6">
      {/* Program Header */}
      <div className="border border-[#1a1a1a]/10 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="font-headline text-2xl font-bold border-b border-[#1a1a1a]/20 bg-transparent focus:outline-none focus:border-[#c41e3a]"
                  autoFocus
                />
                <button onClick={() => { updateProgram({ name: nameDraft }); setEditingName(false); }} className="text-xs text-[#15803d] hover:underline">Save</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-stone-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <h1 className="font-headline text-2xl font-bold text-[#1a1a1a] cursor-pointer hover:text-[#c41e3a]" onClick={() => { setNameDraft(program.name); setEditingName(true); }}>
                {program.name}
              </h1>
            )}

            {editingDesc ? (
              <div className="mt-2">
                <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={2} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none" />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => { updateProgram({ description: descDraft }); setEditingDesc(false); }} className="text-xs text-[#15803d] hover:underline">Save</button>
                  <button onClick={() => setEditingDesc(false)} className="text-xs text-stone-400 hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500 mt-1 cursor-pointer hover:text-stone-700" onClick={() => { setDescDraft(program.description); setEditingDesc(true); }}>
                {program.description || 'Click to add description...'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Owner</label>
            <input type="text" value={program.owner || ''} onChange={(e) => updateProgram({ owner: e.target.value })} placeholder="Program owner..." className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Start Date</label>
            <input type="date" value={program.startDate || ''} onChange={(e) => updateProgram({ startDate: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Target Date</label>
            <input type="date" value={program.targetDate || ''} onChange={(e) => updateProgram({ targetDate: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
          </div>
        </div>
      </div>

      {/* Cross-project rollup */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-[#1a1a1a]/10 p-4">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Projects by RAG</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-[#15803d]" />{projectsByRag.green}</span>
            <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-[#d97706]" />{projectsByRag.amber}</span>
            <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-[#c41e3a]" />{projectsByRag.red}</span>
          </div>
        </div>
        <div className="border border-[#1a1a1a]/10 p-4">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Milestone Completion</p>
          <p className="text-2xl font-bold text-[#1a1a1a] mt-1">{msPct}%</p>
          <p className="text-xs text-stone-400">{completedMs} / {totalMs}</p>
        </div>
        <div className="border border-[#1a1a1a]/10 p-4">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">KPIs at Risk</p>
          <p className={`text-2xl font-bold mt-1 ${kpisAtRisk > 0 ? 'text-[#d97706]' : 'text-[#15803d]'}`}>{kpisAtRisk}</p>
        </div>
        <div className="border border-[#1a1a1a]/10 p-4">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Open SLA Breaches</p>
          <p className={`text-2xl font-bold mt-1 ${openBreaches > 0 ? 'text-[#c41e3a]' : 'text-[#15803d]'}`}>{openBreaches}</p>
        </div>
      </div>

      {/* Program KPIs & SLAs */}
      <div className="border-t border-[#1a1a1a]/10 pt-6">
        <h2 className="font-headline text-lg font-bold text-[#1a1a1a] mb-4">Program KPIs & SLAs</h2>
        <KpisTab project={programAsProject} />
      </div>
    </div>
  );
}
