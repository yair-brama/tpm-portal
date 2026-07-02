import { useState, useMemo, useCallback } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { msStatusColor, msStatusBg, msStatusLabel, formatDate, daysUntil } from '../../lib/helpers';
import { parseImportFile, computeImportDiff, applyImport } from '../../lib/import';

const STATUS_DOT = { completed: 'bg-[#15803d]', in_progress: 'bg-[#1a1a1a]', upcoming: 'bg-stone-400', delayed: 'bg-[#c41e3a]' };

export default function MilestonesTab({ project }) {
  const storeMilestones = useStore((s) => s.milestones);
  const storeDataImports = useStore((s) => s.dataImports);
  const allMilestones = useMemo(() => storeMilestones.filter((m) => m.projectId === project.id), [storeMilestones, project.id]);
  const dataImports = useMemo(() => storeDataImports.filter((d) => d.projectId === project.id), [storeDataImports, project.id]);
  const addDataImport = useStore((s) => s.addDataImport);
  const archiveMilestone = useStore((s) => s.archiveMilestone);
  const restoreMilestone = useStore((s) => s.restoreMilestone);
  const deleteMilestone = useStore((s) => s.deleteMilestone);
  const [view, setView] = useState('table');
  const [showImport, setShowImport] = useState(false);
  const [importProfile, setImportProfile] = useState('generic');
  const [importDiff, setImportDiff] = useState(null);
  const [importParsed, setImportParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => allMilestones.filter((m) => !m.archivedAt), [allMilestones]);
  const archived = useMemo(() => allMilestones.filter((m) => m.archivedAt), [allMilestones]);
  const latestImport = dataImports.length > 0
    ? dataImports.reduce((a, b) => (new Date(a.importedAt) > new Date(b.importedAt) ? a : b))
    : null;

  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await parseImportFile(file, importProfile);
      if (result.errors && result.errors.length > 0) {
        alert('Import errors:\n' + result.errors.join('\n'));
        setImporting(false);
        return;
      }
      const incoming = result.milestones || [];
      const existing = allMilestones.filter((m) => m.projectId === project.id);
      const diff = computeImportDiff(existing, incoming);
      setImportDiff(diff);
      setImportParsed({ milestones: incoming, file: file.name, warnings: result.warnings || [] });
    } catch (err) {
      alert('Failed to parse file: ' + err.message);
    }
    setImporting(false);
  }, [importProfile, allMilestones, project.id]);

  const handleApplyImport = () => {
    if (!importDiff || !importParsed) return;
    const existing = allMilestones.filter((m) => m.projectId === project.id);
    const merged = applyImport(project.id, existing, importDiff);
    // Replace all milestones for this project
    const otherMs = storeMilestones.filter((m) => m.projectId !== project.id);
    useStore.setState({ milestones: [...otherMs, ...merged] });
    addDataImport({ projectId: project.id, fileName: importParsed.file, profile: importProfile, milestoneCount: importParsed.milestones.length });
    setImportDiff(null);
    setImportParsed(null);
    setShowImport(false);
  };

  // Gantt helpers
  const ganttData = useMemo(() => {
    if (active.length === 0) return null;
    const withDates = active.filter((m) => m.dueDate);
    if (withDates.length === 0) return null;
    const allDates = withDates.flatMap((m) => [m.startDate, m.dueDate].filter(Boolean));
    const minDate = new Date(Math.min(...allDates.map((d) => new Date(d + 'T00:00:00'))));
    const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d + 'T00:00:00'))));
    const rangeDays = Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 7);
    const startDate = new Date(minDate.getTime() - 3 * 86400000);
    return { startDate, rangeDays, today: new Date() };
  }, [active]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Milestones</h2>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#1a1a1a]/15">
            <button onClick={() => setView('table')} className={`px-3 py-1 text-xs ${view === 'table' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              <Icon name="table_rows" className="text-[16px] align-middle mr-1" />Table
            </button>
            <button onClick={() => setView('gantt')} className={`px-3 py-1 text-xs ${view === 'gantt' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              <Icon name="view_timeline" className="text-[16px] align-middle mr-1" />Gantt
            </button>
          </div>
        </div>
      </div>

      {/* Import banner */}
      {latestImport && (
        <div className="bg-[#f5f1eb] border border-[#1a1a1a]/10 px-4 py-2 flex items-center justify-between text-xs text-stone-600">
          <span>Last imported from <strong>{latestImport.fileName}</strong> on {formatDate(latestImport.importedAt?.split('T')[0])}</span>
          <button onClick={() => setShowImport(!showImport)} className="text-[#c41e3a] hover:underline">
            {showImport ? 'Hide' : 'Import new file'}
          </button>
        </div>
      )}
      {!latestImport && (
        <button onClick={() => setShowImport(!showImport)} className="text-xs text-[#c41e3a] hover:underline">
          {showImport ? 'Hide import panel' : 'Import milestones from file'}
        </button>
      )}

      {/* Import panel */}
      {showImport && (
        <div className="border border-[#1a1a1a]/10 p-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Import Profile</label>
            <select value={importProfile} onChange={(e) => setImportProfile(e.target.value)} className="border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none">
              <option value="generic">Generic CSV</option>
              <option value="smartsheet">Smartsheet</option>
              <option value="jira">Jira (CSV or JSON export)</option>
            </select>
          </div>
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 hover:border-[#c41e3a]/40 hover:text-stone-600 transition-colors cursor-pointer"
            onClick={() => document.getElementById('ms-import-input')?.click()}
          >
            <Icon name="upload_file" className="text-[32px] block mx-auto mb-2 text-stone-300" />
            <p>Drop a CSV or JSON file here, or click to browse</p>
            <input id="ms-import-input" type="file" accept=".csv,.json" className="hidden" onChange={handleFileDrop} />
          </div>
          {importing && <p className="text-xs text-stone-500">Parsing file...</p>}

          {/* Diff preview */}
          {importDiff && importParsed && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-[#15803d]">Updated: {importDiff.updated.length}</span>
                <span className="text-blue-600">Added: {importDiff.added.length}</span>
                <span className="text-stone-500">Not in file: {importDiff.notInFile.length}</span>
              </div>
              {importParsed.warnings.length > 0 && (
                <div className="text-xs text-[#d97706] space-y-0.5">
                  {importParsed.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleApplyImport} className="px-3 py-1.5 text-xs bg-[#15803d] text-white hover:bg-[#15803d]/80">Apply</button>
                <button onClick={() => { setImportDiff(null); setImportParsed(null); }} className="px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="overflow-x-auto">
          {active.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Icon name="timeline" className="text-[48px] block mx-auto mb-3 text-stone-300" />
              <p className="text-sm">No milestones yet. Import from a file to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10 text-xs uppercase tracking-wider text-stone-400">
                  <th className="py-2 pr-2 w-4"></th>
                  <th className="py-2 text-left font-semibold">Name</th>
                  <th className="py-2 text-left font-semibold">Assignees</th>
                  <th className="py-2 text-left font-semibold">Due Date</th>
                  <th className="py-2 text-left font-semibold">Depends On</th>
                  <th className="py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {active.map((ms) => {
                  const deps = (ms.predecessorNames || ms.dependsOn || []);
                  const depIds = ms.predecessorIds || [];
                  return (
                    <tr key={ms.id} className={`border-b border-[#1a1a1a]/5 hover:bg-stone-50 ${ms.isBlocked ? 'border-l-2 border-l-[#c41e3a]' : ''}`}>
                      <td className="py-2.5 pr-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[ms.status] || 'bg-stone-400'}`} />
                      </td>
                      <td className="py-2.5 font-medium text-[#1a1a1a]">
                        {ms.name}
                        {ms.isBlocked && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#c41e3a]/10 text-[#c41e3a] border border-[#c41e3a]/15">Blocked</span>}
                        {ms.notInLatestImport && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/15">not in latest import</span>}
                      </td>
                      <td className="py-2.5 text-stone-600">{(ms.assignees || []).join(', ') || '—'}</td>
                      <td className="py-2.5 text-stone-600">{formatDate(ms.dueDate)}</td>
                      <td className="py-2.5">
                        {deps.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {deps.map((dep, i) => {
                              const predId = depIds[i];
                              const pred = predId ? allMilestones.find((m) => m.id === predId) : null;
                              const isIncomplete = pred && pred.status !== 'completed';
                              return (
                                <span key={i} className={`text-[10px] px-1.5 py-0.5 border ${isIncomplete ? 'bg-[#c41e3a]/10 text-[#c41e3a] border-[#c41e3a]/15' : 'bg-[#15803d]/10 text-[#15803d] border-[#15803d]/15'}`}>
                                  {dep}
                                </span>
                              );
                            })}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 border font-medium ${msStatusBg(ms.status)}`}>
                          {msStatusLabel(ms.status)}
                        </span>
                        {ms.notInLatestImport && !ms.archivedAt && (
                          <button onClick={() => archiveMilestone(ms.id)} className="ml-2 text-[10px] text-[#c41e3a] hover:underline">Archive</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Archived section */}
          {archived.length > 0 && (
            <details className="mt-4" open={showArchived} onToggle={(e) => setShowArchived(e.target.open)}>
              <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600 uppercase tracking-wider font-semibold">
                Archived ({archived.length})
              </summary>
              <table className="w-full text-sm mt-2 opacity-60">
                <tbody>
                  {archived.map((ms) => (
                    <tr key={ms.id} className="border-b border-[#1a1a1a]/5">
                      <td className="py-2 pr-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-300" /></td>
                      <td className="py-2 text-stone-500 line-through">{ms.name}</td>
                      <td className="py-2 text-stone-400">{formatDate(ms.dueDate)}</td>
                      <td className="py-2">
                        <button onClick={() => restoreMilestone(ms.id)} className="text-[10px] text-[#c41e3a] hover:underline mr-2">Restore</button>
                        <button onClick={() => deleteMilestone(ms.id)} className="text-[10px] text-stone-400 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}

      {/* Gantt view */}
      {view === 'gantt' && (
        <div className="overflow-x-auto">
          {!ganttData ? (
            <div className="text-center py-12 text-stone-400">
              <p className="text-sm">No milestones with dates to display in Gantt view.</p>
            </div>
          ) : (
            <GanttChart milestones={active} ganttData={ganttData} allMilestones={allMilestones} />
          )}
        </div>
      )}
    </div>
  );
}

function GanttChart({ milestones, ganttData, allMilestones }) {
  const { startDate, rangeDays, today } = ganttData;
  const ROW_H = 32;
  const LABEL_W = 200;
  const DAY_W = 16;
  const chartW = rangeDays * DAY_W;
  const totalW = LABEL_W + chartW;
  const totalH = milestones.length * ROW_H + 40;

  const dayOffset = (dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr + 'T00:00:00');
    return Math.max(0, Math.ceil((d - startDate) / 86400000));
  };

  const todayOffset = dayOffset(today.toISOString().split('T')[0]);

  const statusBarColor = {
    completed: '#15803d',
    in_progress: '#1a1a1a',
    upcoming: '#a8a29e',
    delayed: '#c41e3a',
  };

  return (
    <svg width={totalW} height={totalH} className="text-xs">
      {/* Grid lines */}
      {Array.from({ length: rangeDays }, (_, i) => (
        <line key={i} x1={LABEL_W + i * DAY_W} y1={30} x2={LABEL_W + i * DAY_W} y2={totalH} stroke="#e7e5e4" strokeWidth={0.5} />
      ))}

      {/* Today line */}
      <line x1={LABEL_W + todayOffset * DAY_W} y1={30} x2={LABEL_W + todayOffset * DAY_W} y2={totalH} stroke="#c41e3a" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={LABEL_W + todayOffset * DAY_W} y={24} fill="#c41e3a" fontSize={10} textAnchor="middle">Today</text>

      {/* Milestone bars */}
      {milestones.map((ms, i) => {
        const y = 40 + i * ROW_H;
        const start = ms.startDate ? dayOffset(ms.startDate) : (ms.dueDate ? dayOffset(ms.dueDate) - 5 : 0);
        const end = ms.dueDate ? dayOffset(ms.dueDate) : start + 5;
        const barX = LABEL_W + start * DAY_W;
        const barW = Math.max(DAY_W, (end - start) * DAY_W);
        const color = statusBarColor[ms.status] || '#a8a29e';

        return (
          <g key={ms.id}>
            {/* Label */}
            <text x={4} y={y + ROW_H / 2 + 4} fill="#1a1a1a" fontSize={11} className="truncate">
              {ms.name.length > 24 ? ms.name.slice(0, 22) + '...' : ms.name}
            </text>
            {/* Bar */}
            <rect x={barX} y={y + 4} width={barW} height={ROW_H - 8} fill={color} rx={2} opacity={0.85} />
            {/* Dependency arrows */}
            {(ms.predecessorIds || []).map((predId) => {
              const pred = allMilestones.find((m) => m.id === predId);
              if (!pred || !pred.dueDate) return null;
              const predEnd = LABEL_W + dayOffset(pred.dueDate) * DAY_W;
              const predIdx = milestones.findIndex((m) => m.id === predId);
              if (predIdx === -1) return null;
              const predY = 40 + predIdx * ROW_H + ROW_H / 2;
              const msY = y + ROW_H / 2;
              return (
                <line key={predId} x1={predEnd} y1={predY} x2={barX} y2={msY} stroke="#a8a29e" strokeWidth={1} markerEnd="url(#arrow)" />
              );
            })}
          </g>
        );
      })}

      {/* Arrow marker */}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4 Z" fill="#a8a29e" />
        </marker>
      </defs>
    </svg>
  );
}
