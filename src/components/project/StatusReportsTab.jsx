import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { ragBg, formatDate } from '../../lib/helpers';
import { generateStatusReport, isAiReady } from '../../lib/ai';

export default function StatusReportsTab({ project }) {
  const allReports = useStore((s) => s.statusReports);
  const allMilestones = useStore((s) => s.milestones);
  const allGoals = useStore((s) => s.goals);
  const allNotes = useStore((s) => s.notes);
  const addStatusReport = useStore((s) => s.addStatusReport);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const aiProvider = useStore((s) => s.aiProvider);
  const aiModel = useStore((s) => s.aiModel);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);
  const aiReady = isAiReady(aiProvider, aiApiKey);
  const reports = useMemo(() => allReports.filter((r) => r.projectId === project.id), [allReports, project.id]);
  const milestones = useMemo(() => allMilestones.filter((m) => m.projectId === project.id && !m.archivedAt), [allMilestones, project.id]);
  const goals = useMemo(() => allGoals.filter((g) => g.projectId === project.id), [allGoals, project.id]);
  const notes = useMemo(() => allNotes.filter((n) => n.projectId === project.id), [allNotes, project.id]);
  const [generating, setGenerating] = useState(false);

  const sorted = [...reports].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

  const handleGenerate = async () => {
    if (!aiReady) {
      // Generate a placeholder report
      addStatusReport({
        projectId: project.id,
        period: `Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        ragStatus: project.status === 'off_track' ? 'red' : project.status === 'at_risk' ? 'amber' : 'green',
        summary: 'Configure your API key in Settings to use AI-powered report generation. This is a placeholder report.',
        accomplishments: ['Placeholder: Review milestones and update statuses.'],
        nextSteps: ['Placeholder: Continue tracking deliverables.'],
        risks: ['Placeholder: No AI analysis available without API key.'],
      });
      return;
    }

    setGenerating(true);
    try {
      const report = await generateStatusReport({ provider: aiProvider, apiKey: aiApiKey, model: aiModel, baseUrl: aiBaseUrl }, project, milestones, goals, notes);
      addStatusReport({ ...report, projectId: project.id });
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        alert('Configure your API key in Settings to use AI features.');
      } else {
        alert('Failed to generate report: ' + err.message);
      }
    }
    setGenerating(false);
  };

  const handleCopy = (report) => {
    const text = `Status Report: ${report.period}
RAG: ${report.ragStatus?.toUpperCase()}
Generated: ${formatDate(report.generatedAt?.split('T')[0])}

Summary:
${report.summary}

Accomplishments:
${(report.accomplishments || []).map((a) => '- ' + a).join('\n')}

Next Steps:
${(report.nextSteps || []).map((n) => '- ' + n).join('\n')}

Risks:
${(report.risks || []).map((r) => '- ' + r).join('\n')}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-5">
      <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Status Reports</h2>

      {/* AI Status Engine */}
      <div className="border border-[#1a1a1a]/10 p-4 bg-[#f5f1eb] relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">AI Status Engine</p>
            <p className="text-xs text-stone-500 mt-1">
              {aiReady ? 'Generate an AI-powered status report from your project data.' : 'Configure your API key in Settings to use AI features.'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#c41e3a] text-white hover:bg-[#c41e3a]/80 disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {generating && (
          <div className="absolute inset-0 bg-[#f5f1eb]/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-4 h-4 border-2 border-[#c41e3a] border-t-transparent rounded-full animate-spin" />
              Generating report...
            </div>
          </div>
        )}
      </div>

      {/* Report cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Icon name="summarize" className="text-[48px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm">No status reports yet. Generate one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((report) => (
            <div key={report.id} className="border border-[#1a1a1a]/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-sm text-[#1a1a1a]">{report.period}</h3>
                  <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${ragBg(report.ragStatus)}`}>
                    {report.ragStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{formatDate(report.generatedAt?.split('T')[0])}</span>
                  <button onClick={() => handleCopy(report)} className="text-stone-400 hover:text-[#1a1a1a]">
                    <Icon name="content_copy" className="text-[16px]" />
                  </button>
                </div>
              </div>

              {report.summary && (
                <p className="text-sm text-stone-700 mb-3">{report.summary}</p>
              )}

              {(report.accomplishments || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Accomplishments</p>
                  <ul className="space-y-0.5">
                    {report.accomplishments.map((a, i) => (
                      <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                        <Icon name="check" className="text-[14px] text-[#15803d] flex-shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(report.nextSteps || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Next Steps</p>
                  <ul className="space-y-0.5">
                    {report.nextSteps.map((n, i) => (
                      <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                        <Icon name="arrow_forward" className="text-[14px] text-stone-400 flex-shrink-0 mt-0.5" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(report.risks || []).length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Risks</p>
                  <ul className="space-y-0.5">
                    {report.risks.map((r, i) => (
                      <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                        <Icon name="warning" className="text-[14px] text-[#d97706] flex-shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
