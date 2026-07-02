import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { generateRaciMatrix } from '../../lib/ai';

const CELL_COLORS = {
  R: 'bg-stone-100 text-[#1a1a1a] font-bold',
  A: 'bg-[#c41e3a]/10 text-[#c41e3a] font-bold',
  C: 'bg-[#d97706]/10 text-[#d97706] font-bold',
  I: 'bg-[#15803d]/10 text-[#15803d] font-bold',
  '': 'bg-transparent text-stone-300',
};

export default function RaciTab({ project }) {
  const raci = useStore((s) => (s.raciData || {})[project.id]);
  const allMilestones = useStore((s) => s.milestones);
  const allNotes = useStore((s) => s.notes);
  const allGoals = useStore((s) => s.goals);
  const discovery = useStore((s) => s.discoveryState[project.id]);
  const setRaci = useStore((s) => s.setRaci);
  const cycleRaciCell = useStore((s) => s.cycleRaciCell);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const aiProvider = useStore((s) => s.aiProvider);
  const aiModel = useStore((s) => s.aiModel);
  const milestones = useMemo(() => allMilestones.filter((m) => m.projectId === project.id && !m.archivedAt), [allMilestones, project.id]);
  const notes = useMemo(() => allNotes.filter((n) => n.projectId === project.id), [allNotes, project.id]);
  const goals = useMemo(() => allGoals.filter((g) => g.projectId === project.id), [allGoals, project.id]);
  const [generating, setGenerating] = useState(false);

  // Normalize RACI data: support both {columns,rows with cells-as-object} and {people,rows with cells-as-array}
  const normalizedRaci = useMemo(() => {
    if (!raci) return null;
    if (raci.people) return raci;
    if (raci.columns) {
      const cols = [...raci.columns].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return {
        people: cols.map(c => ({ name: c.name, role: c.role || '' })),
        rows: (raci.rows || []).map(r => ({
          area: r.area,
          cells: cols.map(c => (r.cells && r.cells[c.id]) || ''),
        })),
      };
    }
    return raci;
  }, [raci]);

  const handleGenerate = async () => {
    if (!aiApiKey) {
      // Generate placeholder RACI
      const people = (project.stakeholders || []).map((s) => ({ name: s, role: '' }));
      if (people.length === 0) {
        people.push({ name: project.owner || 'Project Owner', role: 'Owner' });
        people.push({ name: 'Stakeholder 1', role: '' });
        people.push({ name: 'Stakeholder 2', role: '' });
      }
      const rows = [
        { area: 'Project Planning', cells: people.map((_, i) => (i === 0 ? 'A' : i === 1 ? 'R' : 'C')) },
        { area: 'Technical Execution', cells: people.map((_, i) => (i === 0 ? 'A' : i === 1 ? 'R' : 'I')) },
        { area: 'Stakeholder Communication', cells: people.map((_, i) => (i === 0 ? 'R' : 'I')) },
        { area: 'Risk Management', cells: people.map((_, i) => (i === 0 ? 'A' : i === 1 ? 'C' : 'I')) },
        { area: 'Quality Assurance', cells: people.map((_, i) => (i === 0 ? 'A' : i === 1 ? 'R' : '')) },
      ];
      setRaci(project.id, { people, rows });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateRaciMatrix({ provider: aiProvider, apiKey: aiApiKey, model: aiModel }, project, project.stakeholders, milestones, goals, notes, discovery);
      setRaci(project.id, result);
    } catch (err) {
      alert('Failed to generate RACI: ' + err.message);
    }
    setGenerating(false);
  };

  const handleExportCsv = () => {
    if (!normalizedRaci) return;
    const headers = ['Area', ...normalizedRaci.people.map((p) => `${p.name}${p.role ? ` (${p.role})` : ''}`)];
    const rows = normalizedRaci.rows.map((r) => [r.area, ...r.cells]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_RACI.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    if (!normalizedRaci) return;
    const headers = ['Area', ...normalizedRaci.people.map((p) => p.name)];
    const separator = headers.map(() => '---');
    const rows = normalizedRaci.rows.map((r) => [r.area, ...r.cells]);
    const md = [headers.join(' | '), separator.join(' | '), ...rows.map((r) => r.join(' | '))].join('\n');
    navigator.clipboard.writeText(md);
  };

  if (!normalizedRaci) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">RACI Matrix</h2>
          <p className="text-sm text-stone-500 mt-1">Define roles and responsibilities for project activities.</p>
        </div>
        <div className="text-center py-16 border border-[#1a1a1a]/10">
          <Icon name="grid_on" className="text-[48px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm text-stone-400 mb-4">No RACI matrix defined yet.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-[#c41e3a] text-white hover:bg-[#c41e3a]/80 disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            {generating ? 'Generating...' : 'Generate RACI Matrix'}
          </button>
        </div>
      </div>
    );
  }

  // Check rows missing an Accountable
  const rowsMissingA = normalizedRaci.rows.map((r, i) => ({
    ...r,
    idx: i,
    hasA: r.cells.includes('A'),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">RACI Matrix</h2>
        <p className="text-sm text-stone-500 mt-1">Define roles and responsibilities for project activities.</p>
      </div>

      {/* Info tip */}
      <div className="bg-[#f5f1eb] border border-[#1a1a1a]/10 px-4 py-2 text-xs text-stone-600 flex items-center gap-2">
        <Icon name="info" className="text-[16px] text-stone-400" />
        Click any cell to cycle R &rarr; A &rarr; C &rarr; I &rarr; blank
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 bg-stone-100 text-[#1a1a1a] font-bold text-center leading-5">R</span> Responsible</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 bg-[#c41e3a]/10 text-[#c41e3a] font-bold text-center leading-5">A</span> Accountable</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 bg-[#d97706]/10 text-[#d97706] font-bold text-center leading-5">C</span> Consulted</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 bg-[#15803d]/10 text-[#15803d] font-bold text-center leading-5">I</span> Informed</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#1a1a1a]/15">
              <th className="py-2 text-left text-xs uppercase tracking-wider text-stone-400 font-semibold pr-4">Area</th>
              {normalizedRaci.people.map((p, i) => (
                <th key={i} className="py-2 text-center text-xs px-2 min-w-[80px]">
                  <div className="font-semibold text-[#1a1a1a]">{p.name}</div>
                  {p.role && <div className="font-normal text-stone-400">{p.role}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsMissingA.map((row) => (
              <tr
                key={row.idx}
                className={`border-b border-[#1a1a1a]/5 ${!row.hasA ? 'bg-[#d97706]/5' : ''}`}
              >
                <td className="py-2.5 pr-4 font-medium text-[#1a1a1a]">
                  {row.area}
                  {!row.hasA && (
                    <span className="ml-2 text-[10px] text-[#d97706]">
                      <Icon name="warning" className="text-[12px] align-middle" /> No accountable
                    </span>
                  )}
                </td>
                {row.cells.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="py-2.5 text-center cursor-pointer hover:ring-1 hover:ring-[#c41e3a]/30 transition-all"
                    onClick={() => cycleRaciCell(project.id, row.idx, colIdx)}
                  >
                    <span className={`inline-flex items-center justify-center w-8 h-8 text-sm ${CELL_COLORS[cell] || CELL_COLORS['']}`}>
                      {cell || '-'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100 disabled:opacity-50">
          <Icon name="refresh" className="text-[16px]" />
          Regenerate
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
          <Icon name="download" className="text-[16px]" />
          Export CSV
        </button>
        <button onClick={handleCopyMarkdown} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
          <Icon name="content_copy" className="text-[16px]" />
          Copy as Markdown
        </button>
      </div>
    </div>
  );
}
