import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import Modal from '../shared/Modal';
import Sparkline from '../shared/Sparkline';
import { ragBg, kpiRag, formatDate } from '../../lib/helpers';
import { computeKpiValue } from '../../lib/kpiCompute';
import { suggestKpis } from '../../lib/ai';
import { parseImportFile as parseKpiImport } from '../../lib/import';

const CATEGORIES = ['delivery', 'quality', 'efficiency', 'risk'];
const CATEGORY_COLORS = { delivery: 'bg-blue-50 text-blue-700 border-blue-200', quality: 'bg-purple-50 text-purple-700 border-purple-200', efficiency: 'bg-emerald-50 text-emerald-700 border-emerald-200', risk: 'bg-orange-50 text-orange-700 border-orange-200' };
const FORMULA_TEMPLATES = [
  { key: 'milestone_completion_pct', label: 'Milestone Completion %', params: ['filterAssignee', 'includeDelayed'] },
  { key: 'on_time_pct', label: 'On-Time Delivery %', params: ['gracePeriodDays', 'filterAssignee'] },
  { key: 'blocked_count', label: 'Blocked Count', params: ['filterAssignee'] },
  { key: 'count', label: 'Count', params: ['countTarget', 'countStatus', 'filterAssignee'] },
  { key: 'ratio', label: 'Ratio', params: ['ratioNumeratorStatus', 'ratioDenominatorStatus', 'filterAssignee'] },
];

export default function KpisTab({ project }) {
  const allKpis = useStore((s) => s.kpis);
  const allMilestones = useStore((s) => s.milestones);
  const allGoals = useStore((s) => s.goals);
  const allNotes = useStore((s) => s.notes);
  const kpis = useMemo(() => allKpis.filter((k) => k.projectId === project.id), [allKpis, project.id]);
  const milestones = useMemo(() => allMilestones.filter((m) => m.projectId === project.id && !m.archivedAt), [allMilestones, project.id]);
  const goals = useMemo(() => allGoals.filter((g) => g.projectId === project.id), [allGoals, project.id]);
  const notes = useMemo(() => allNotes.filter((n) => n.projectId === project.id), [allNotes, project.id]);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const aiProvider = useStore((s) => s.aiProvider);
  const aiModel = useStore((s) => s.aiModel);
  const addKpi = useStore((s) => s.addKpi);
  const recordKpiValue = useStore((s) => s.recordKpiValue);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestingAi, setSuggestingAi] = useState(false);
  const [addTab, setAddTab] = useState('manual');
  const [updateModal, setUpdateModal] = useState(null);
  const [updateValue, setUpdateValue] = useState('');

  // Add form state
  const [form, setForm] = useState({
    name: '', category: 'delivery', type: 'kpi', unit: '%', direction: 'higher_is_better',
    source: 'manual', interval: 'weekly', target: '', thresholdGreen: '', thresholdAmber: '',
    formulaTemplate: '', formulaParams: {},
  });

  // Computed formula preview
  const formulaPreview = useMemo(() => {
    if (form.source !== 'computed' || !form.formulaTemplate) return null;
    try {
      return computeKpiValue(form.formulaTemplate, milestones, goals, notes, form.formulaParams);
    } catch { return null; }
  }, [form.source, form.formulaTemplate, form.formulaParams, milestones, goals, notes]);

  const handleSuggestAi = async () => {
    if (!aiApiKey) {
      alert('Configure your API key in Settings to use AI features.');
      return;
    }
    setSuggestingAi(true);
    try {
      const result = await suggestKpis({ provider: aiProvider, apiKey: aiApiKey, model: aiModel }, project, milestones, goals, notes, kpis);
      setSuggestions(result);
      setShowSuggestions(true);
    } catch (err) {
      alert('Failed to get suggestions: ' + err.message);
    }
    setSuggestingAi(false);
  };

  const handleAddSuggestion = (sug) => {
    addKpi({
      projectId: project.id,
      name: sug.name,
      category: sug.category,
      type: sug.type,
      unit: sug.unit,
      direction: sug.direction,
      target: sug.suggestedTarget ?? sug.target,
      thresholds: sug.thresholds || null,
      source: 'manual',
      interval: 'weekly',
    });
    setSuggestions(suggestions.filter((s) => s !== sug));
  };

  const handleSubmitAdd = () => {
    if (!form.name.trim()) return;
    addKpi({
      projectId: project.id,
      name: form.name,
      category: form.category,
      type: form.type,
      unit: form.unit,
      direction: form.direction,
      target: form.target ? parseFloat(form.target) : null,
      thresholds: form.thresholdGreen && form.thresholdAmber ? { green: parseFloat(form.thresholdGreen), amber: parseFloat(form.thresholdAmber) } : null,
      source: form.source,
      interval: form.interval,
      formulaTemplate: form.source === 'computed' ? form.formulaTemplate : undefined,
      formulaParams: form.source === 'computed' ? form.formulaParams : undefined,
    });
    setForm({ name: '', category: 'delivery', type: 'kpi', unit: '%', direction: 'higher_is_better', source: 'manual', interval: 'weekly', target: '', thresholdGreen: '', thresholdAmber: '', formulaTemplate: '', formulaParams: {} });
    setShowAdd(false);
  };

  const handleUpdateValue = () => {
    if (!updateModal || !updateValue) return;
    recordKpiValue(updateModal.id, parseFloat(updateValue));
    setUpdateModal(null);
    setUpdateValue('');
  };

  const handleExportCsv = () => {
    const csv = ['Name,Category,Type,Current Value,Target,Unit'].concat(
      kpis.map((k) => `"${k.name}","${k.category}","${k.type}",${k.currentValue ?? ''},${k.target ?? ''},"${k.unit || ''}"`)
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_KPIs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHistoryCsv = (kpi) => {
    const csv = ['Date,Value'].concat((kpi.history || []).map((h) => `${h.date},${h.value}`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kpi.name.replace(/\s+/g, '_')}_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detail view
  if (selectedKpi) {
    const kpi = kpis.find((k) => k.id === selectedKpi);
    if (!kpi) { setSelectedKpi(null); return null; }
    const rag = kpiRag(kpi);
    const history = kpi.history || [];
    const last8 = history.slice(-8);
    const breaches = (kpi.breachLog || []).filter((b) => kpi.type === 'sla');

    // Trend chart
    const chartW = 500, chartH = 200, pad = 40;
    const values = last8.map((h) => h.value);
    const minV = values.length > 0 ? Math.min(...values, kpi.thresholds?.amber ?? Infinity) * 0.9 : 0;
    const maxV = values.length > 0 ? Math.max(...values, kpi.target ?? 0, kpi.thresholds?.green ?? 0) * 1.1 : 100;
    const rangeV = maxV - minV || 1;
    const scaleX = (i) => pad + (i / Math.max(1, last8.length - 1)) * (chartW - pad * 2);
    const scaleY = (v) => chartH - pad - ((v - minV) / rangeV) * (chartH - pad * 2);

    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedKpi(null)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-[#1a1a1a]">
          <Icon name="arrow_back" className="text-[18px]" /> Back to KPIs
        </button>

        <div className="flex items-center gap-3">
          <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">{kpi.name}</h2>
          <span className={`text-xs px-1.5 py-0.5 border ${CATEGORY_COLORS[kpi.category] || 'bg-stone-50 text-stone-500 border-stone-200'}`}>{kpi.category}</span>
          <span className="text-xs px-1.5 py-0.5 border bg-stone-50 text-stone-500 border-stone-200">{kpi.type?.toUpperCase()}</span>
          {rag && <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${ragBg(rag)}`}>{rag}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-[#1a1a1a]/10 p-4">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Current Value</p>
            <p className="text-2xl font-bold text-[#1a1a1a] mt-1">{kpi.currentValue ?? '—'}{kpi.unit && <span className="text-sm text-stone-400 ml-1">{kpi.unit}</span>}</p>
          </div>
          <div className="border border-[#1a1a1a]/10 p-4">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Target</p>
            <p className="text-2xl font-bold text-[#1a1a1a] mt-1">{kpi.target ?? '—'}{kpi.unit && <span className="text-sm text-stone-400 ml-1">{kpi.unit}</span>}</p>
          </div>
        </div>

        {/* 8-week trend chart */}
        {last8.length >= 2 && (
          <div className="border border-[#1a1a1a]/10 p-4">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-3">Trend (Last {last8.length} entries)</p>
            <svg width={chartW} height={chartH} className="w-full" viewBox={`0 0 ${chartW} ${chartH}`}>
              {/* Threshold bands */}
              {kpi.thresholds && (
                <>
                  <rect x={pad} y={scaleY(maxV)} width={chartW - pad * 2} height={scaleY(kpi.thresholds.green) - scaleY(maxV)} fill="#15803d" opacity={0.06} />
                  <rect x={pad} y={scaleY(kpi.thresholds.green)} width={chartW - pad * 2} height={scaleY(kpi.thresholds.amber) - scaleY(kpi.thresholds.green)} fill="#d97706" opacity={0.06} />
                  <rect x={pad} y={scaleY(kpi.thresholds.amber)} width={chartW - pad * 2} height={scaleY(minV) - scaleY(kpi.thresholds.amber)} fill="#c41e3a" opacity={0.06} />
                </>
              )}
              {/* Target line */}
              {kpi.target && (
                <line x1={pad} y1={scaleY(kpi.target)} x2={chartW - pad} y2={scaleY(kpi.target)} stroke="#c41e3a" strokeWidth={1} strokeDasharray="4,3" />
              )}
              {/* Data line */}
              <polyline
                fill="none"
                stroke="#1a1a1a"
                strokeWidth={2}
                strokeLinejoin="round"
                points={last8.map((h, i) => `${scaleX(i)},${scaleY(h.value)}`).join(' ')}
              />
              {/* Data points */}
              {last8.map((h, i) => (
                <g key={i}>
                  <circle cx={scaleX(i)} cy={scaleY(h.value)} r={3} fill="#1a1a1a" />
                  <text x={scaleX(i)} y={chartH - 8} textAnchor="middle" fontSize={9} fill="#a8a29e">{h.date?.slice(5)}</text>
                  <text x={scaleX(i)} y={scaleY(h.value) - 8} textAnchor="middle" fontSize={9} fill="#1a1a1a">{h.value}</text>
                </g>
              ))}
              {/* Y axis labels */}
              <text x={4} y={scaleY(maxV) + 4} fontSize={9} fill="#a8a29e">{Math.round(maxV)}</text>
              <text x={4} y={scaleY(minV) + 4} fontSize={9} fill="#a8a29e">{Math.round(minV)}</text>
            </svg>
          </div>
        )}

        {/* Breach log (SLA only) */}
        {kpi.type === 'sla' && breaches.length > 0 && (
          <div className="border border-[#1a1a1a]/10 p-4">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">Breach Log</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10 text-xs text-stone-400">
                  <th className="py-1 text-left">Date</th>
                  <th className="py-1 text-left">Duration</th>
                  <th className="py-1 text-left">Note</th>
                  <th className="py-1 text-left">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map((b, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]/5">
                    <td className="py-1.5 text-stone-600">{formatDate(b.date)}</td>
                    <td className="py-1.5 text-stone-600">{b.duration || '—'}</td>
                    <td className="py-1.5 text-stone-600">{b.note || '—'}</td>
                    <td className="py-1.5">{b.resolved ? <span className="text-[#15803d]">Yes</span> : <span className="text-[#c41e3a]">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Source/interval metadata */}
        <div className="border border-[#1a1a1a]/10 p-4 text-xs text-stone-500">
          <span className="mr-4">Source: {kpi.source || 'manual'}</span>
          <span className="mr-4">Interval: {kpi.interval || 'weekly'}</span>
          {kpi.formulaTemplate && <span>Formula: {kpi.formulaTemplate}</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {kpi.source === 'manual' ? (
            <button onClick={() => { setUpdateModal(kpi); setUpdateValue(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">
              <Icon name="edit" className="text-[16px]" /> Update Value
            </button>
          ) : (
            <span className="text-xs text-stone-400 italic px-3 py-1.5">Auto-computed from project data</span>
          )}
          <button onClick={() => handleExportHistoryCsv(kpi)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
            <Icon name="download" className="text-[16px]" /> Export history CSV
          </button>
        </div>

        {/* Update value modal */}
        {updateModal && (
          <Modal title="Update KPI Value" onClose={() => setUpdateModal(null)}>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">New Value ({updateModal.unit || 'number'})</label>
                <input type="number" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdateValue} className="px-4 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Save</button>
                <button onClick={() => setUpdateModal(null)} className="px-4 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">Cancel</button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">KPIs & SLAs</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleSuggestAi} disabled={suggestingAi} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#c41e3a]/30 text-[#c41e3a] hover:bg-[#c41e3a]/5 disabled:opacity-50">
            <Icon name="auto_awesome" className="text-[16px]" />
            {suggestingAi ? 'Suggesting...' : 'Suggest with AI'}
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">
            <Icon name="add" className="text-[16px]" /> Add KPI/SLA
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
              <Icon name="download" className="text-[16px]" /> Export
            </button>
            <div className="absolute right-0 mt-1 bg-[#fdfcfb] border border-[#1a1a1a]/15 shadow-lg hidden group-hover:block z-10">
              <button onClick={handleExportCsv} className="block w-full text-left px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100">Export as CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* AI suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border border-[#c41e3a]/15 bg-[#c41e3a]/3 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[#c41e3a] font-semibold">AI Suggestions</p>
            <button onClick={() => setShowSuggestions(false)} className="text-xs text-stone-400 hover:text-stone-600">Dismiss all</button>
          </div>
          {suggestions.map((sug, i) => (
            <div key={i} className="flex items-center justify-between bg-[#fdfcfb] border border-[#1a1a1a]/10 p-3">
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">{sug.name}</p>
                <p className="text-xs text-stone-500">{sug.rationale}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 border ${CATEGORY_COLORS[sug.category] || ''}`}>{sug.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 border bg-stone-50 text-stone-500 border-stone-200">{sug.type?.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleAddSuggestion(sug)} className="px-2 py-1 text-xs bg-[#15803d] text-white hover:bg-[#15803d]/80">Add</button>
                <button onClick={() => setSuggestions(suggestions.filter((s) => s !== sug))} className="px-2 py-1 text-xs text-stone-400 hover:text-stone-600">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI table */}
      {kpis.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Icon name="monitoring" className="text-[48px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm">No KPIs or SLAs defined yet.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a]/10 text-xs uppercase tracking-wider text-stone-400">
              <th className="py-2 text-left font-semibold">Category</th>
              <th className="py-2 text-left font-semibold">Name</th>
              <th className="py-2 text-left font-semibold">Type</th>
              <th className="py-2 text-right font-semibold">Current</th>
              <th className="py-2 text-right font-semibold">Target</th>
              <th className="py-2 text-center font-semibold">Trend</th>
              <th className="py-2 text-center font-semibold">RAG</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => {
              const rag = kpiRag(kpi);
              const sparkVals = (kpi.history || []).slice(-8).map((h) => h.value);
              const sparkColor = rag === 'red' ? '#c41e3a' : rag === 'amber' ? '#d97706' : '#15803d';
              return (
                <tr key={kpi.id} className="border-b border-[#1a1a1a]/5 hover:bg-stone-50 cursor-pointer" onClick={() => setSelectedKpi(kpi.id)}>
                  <td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 border ${CATEGORY_COLORS[kpi.category] || 'bg-stone-50 text-stone-500 border-stone-200'}`}>{kpi.category}</span></td>
                  <td className="py-2.5 font-medium text-[#1a1a1a]">{kpi.name}</td>
                  <td className="py-2.5"><span className="text-[10px] px-1.5 py-0.5 border bg-stone-50 text-stone-500 border-stone-200">{kpi.type?.toUpperCase()}</span></td>
                  <td className="py-2.5 text-right text-stone-600">{kpi.currentValue ?? '—'}{kpi.unit && <span className="text-stone-400 ml-0.5">{kpi.unit}</span>}</td>
                  <td className="py-2.5 text-right text-stone-600">{kpi.target ?? '—'}</td>
                  <td className="py-2.5 text-center"><Sparkline values={sparkVals} color={sparkColor} /></td>
                  <td className="py-2.5 text-center">{rag && <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${ragBg(rag)}`}>{rag}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Add KPI modal */}
      {showAdd && (
        <Modal title="Add KPI / SLA" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            {/* Tab toggle */}
            <div className="flex border-b border-[#1a1a1a]/10">
              <button onClick={() => setAddTab('manual')} className={`px-4 py-1.5 text-xs ${addTab === 'manual' ? 'border-b-2 border-[#c41e3a] text-[#c41e3a] font-medium' : 'text-stone-500'}`}>Manual Entry</button>
              <button onClick={() => setAddTab('csv')} className={`px-4 py-1.5 text-xs ${addTab === 'csv' ? 'border-b-2 border-[#c41e3a] text-[#c41e3a] font-medium' : 'text-stone-500'}`}>CSV Import</button>
            </div>

            {addTab === 'manual' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Type</label>
                    <div className="flex border border-[#1a1a1a]/15">
                      <button onClick={() => setForm({ ...form, type: 'kpi' })} className={`flex-1 py-1.5 text-xs ${form.type === 'kpi' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>KPI</button>
                      <button onClick={() => setForm({ ...form, type: 'sla' })} className={`flex-1 py-1.5 text-xs ${form.type === 'sla' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>SLA</button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Unit</label>
                    <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Direction</label>
                    <div className="flex border border-[#1a1a1a]/15">
                      <button onClick={() => setForm({ ...form, direction: 'higher_is_better' })} className={`flex-1 py-1.5 text-xs ${form.direction === 'higher_is_better' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>Higher Better</button>
                      <button onClick={() => setForm({ ...form, direction: 'lower_is_better' })} className={`flex-1 py-1.5 text-xs ${form.direction === 'lower_is_better' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>Lower Better</button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Source</label>
                    <div className="flex border border-[#1a1a1a]/15">
                      <button onClick={() => setForm({ ...form, source: 'manual' })} className={`flex-1 py-1.5 text-xs ${form.source === 'manual' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>Manual</button>
                      <button onClick={() => setForm({ ...form, source: 'computed' })} className={`flex-1 py-1.5 text-xs ${form.source === 'computed' ? 'bg-[#1a1a1a] text-white' : 'text-stone-600'}`}>Computed</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Interval</label>
                    <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>

                {/* Computed source formula builder */}
                {form.source === 'computed' && (
                  <div className="border border-[#1a1a1a]/10 p-3 space-y-2 bg-[#f5f1eb]">
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block">Formula Template</label>
                    <select value={form.formulaTemplate} onChange={(e) => setForm({ ...form, formulaTemplate: e.target.value, formulaParams: {} })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]">
                      <option value="">Select template...</option>
                      {FORMULA_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    {form.formulaTemplate && (
                      <div className="space-y-2 mt-2">
                        {FORMULA_TEMPLATES.find((t) => t.key === form.formulaTemplate)?.params.map((param) => (
                          <div key={param}>
                            <label className="text-[10px] text-stone-400 uppercase">{param}</label>
                            {param === 'countTarget' ? (
                              <select value={form.formulaParams[param] || ''} onChange={(e) => setForm({ ...form, formulaParams: { ...form.formulaParams, [param]: e.target.value } })} className="w-full border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb]">
                                <option value="milestones">Milestones</option>
                                <option value="goals">Goals</option>
                                <option value="notes">Notes</option>
                              </select>
                            ) : param === 'includeDelayed' ? (
                              <select value={form.formulaParams[param] ?? 'true'} onChange={(e) => setForm({ ...form, formulaParams: { ...form.formulaParams, [param]: e.target.value === 'true' } })} className="w-full border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb]">
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : (
                              <input type="text" value={form.formulaParams[param] || ''} onChange={(e) => setForm({ ...form, formulaParams: { ...form.formulaParams, [param]: e.target.value } })} className="w-full border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb]" />
                            )}
                          </div>
                        ))}
                        {formulaPreview !== null && (
                          <p className="text-xs text-[#15803d] mt-1">Preview: {formulaPreview}{form.unit}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Target & thresholds */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Target</label>
                    <input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Green Threshold</label>
                    <input type="number" value={form.thresholdGreen} onChange={(e) => setForm({ ...form, thresholdGreen: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Amber Threshold</label>
                    <input type="number" value={form.thresholdAmber} onChange={(e) => setForm({ ...form, thresholdAmber: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb]" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSubmitAdd} className="px-4 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Add KPI</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">Cancel</button>
                </div>
              </div>
            ) : (
              /* CSV import tab */
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 hover:border-[#c41e3a]/40 cursor-pointer"
                  onClick={() => document.getElementById('kpi-import-input')?.click()}
                >
                  <Icon name="upload_file" className="text-[32px] block mx-auto mb-2 text-stone-300" />
                  <p>Drop a CSV file here, or click to browse</p>
                  <input id="kpi-import-input" type="file" accept=".csv" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await parseKpiImport(file, 'kpi_history');
                      if (result.errors?.length > 0) { alert(result.errors.join('\n')); return; }
                      const entries = result.kpiEntries || [];
                      entries.forEach((entry) => {
                        const existing = kpis.find((k) => k.name.toLowerCase() === entry.kpiName.toLowerCase());
                        if (existing) {
                          recordKpiValue(existing.id, entry.value, entry.date);
                        }
                      });
                      alert(`Imported ${entries.length} data points.`);
                      setShowAdd(false);
                    } catch (err) {
                      alert('Import failed: ' + err.message);
                    }
                  }} />
                </div>
                <div className="text-xs text-stone-400">
                  <p className="font-semibold mb-1">Expected CSV format:</p>
                  <code className="block bg-stone-100 p-2 text-[10px]">kpi_name,date,value,note<br/>Milestone Completion,2024-01-15,75,On track</code>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
