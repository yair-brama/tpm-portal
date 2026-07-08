import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { askAi, isAiReady } from '../../lib/ai';
import { computeAlerts } from '../../lib/alerts';

export default function AskAiPanel() {
  const setAskAiOpen = useStore((s) => s.setAskAiOpen);
  const askAiMessages = useStore((s) => s.askAiMessages);
  const addAskAiMessage = useStore((s) => s.addAskAiMessage);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const aiProvider = useStore((s) => s.aiProvider);
  const aiModel = useStore((s) => s.aiModel);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);
  const projects = useStore((s) => s.projects);
  const milestones = useStore((s) => s.milestones);
  const goals = useStore((s) => s.goals);
  const notes = useStore((s) => s.notes);
  const kpis = useStore((s) => s.kpis);
  const documents = useStore((s) => s.documents);
  const program = useStore((s) => s.program);
  const statusReports = useStore((s) => s.statusReports);
  const dataImports = useStore((s) => s.dataImports);
  const discoveryState = useStore((s) => s.discoveryState);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [askAiMessages]);

  // On a project page, scope the context to that project; otherwise
  // (dashboard, program, settings) use the program-wide view.
  const location = useLocation();
  const projectId = location.pathname.match(/^\/project\/([^/]+)/)?.[1] || null;
  const currentProject = projectId ? projects.find((p) => p.id === projectId) : null;

  const contextLabel = currentProject ? currentProject.name : 'All Projects';

  const buildContext = () => {
    if (currentProject) {
      return {
        isProgram: false,
        project: currentProject,
        milestones: milestones.filter((m) => m.projectId === currentProject.id && !m.archivedAt),
        goals: goals.filter((g) => g.projectId === currentProject.id),
        notes: notes.filter((n) => n.projectId === currentProject.id),
        kpis: kpis.filter((k) => k.projectId === currentProject.id),
        documents: documents.filter((d) => d.projectId === currentProject.id),
      };
    }
    return {
      isProgram: true,
      program,
      projects,
      milestones: milestones.filter((m) => !m.archivedAt),
      kpis: kpis.filter((k) => !k.projectId || (program.kpiIds || []).includes(k.id)),
      alerts: computeAlerts(projects, milestones, statusReports, kpis, dataImports, discoveryState),
      documents,
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput('');
    addAskAiMessage({ role: 'user', content: question, timestamp: new Date().toISOString() });

    if (!isAiReady(aiProvider, aiApiKey)) {
      // Simulated response
      addAskAiMessage({
        role: 'assistant',
        content: 'Configure your API key in Settings to use AI features. I can help with project analysis, status recommendations, and generating insights from your data.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setLoading(true);
    try {
      const context = buildContext();
      const messages = [...askAiMessages.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: question }];
      const response = await askAi({ provider: aiProvider, apiKey: aiApiKey, model: aiModel, baseUrl: aiBaseUrl }, messages, context);
      addAskAiMessage({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
    } catch (err) {
      addAskAiMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#fdfcfb] border-l border-[#1a1a1a]/15 shadow-xl z-40 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a]/10 flex items-center justify-between bg-[#f5f1eb]">
        <div>
          <h3 className="font-headline font-bold text-sm uppercase tracking-wider">Ask AI</h3>
          <p className="text-[10px] text-stone-400 mt-0.5">Context: {contextLabel}</p>
        </div>
        <button
          onClick={() => setAskAiOpen(false)}
          className="w-8 h-8 hover:bg-stone-200 flex items-center justify-center text-stone-500"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      {/* Context chip */}
      <div className="px-4 py-2 border-b border-[#1a1a1a]/5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#c41e3a]/8 text-[#c41e3a] border border-[#c41e3a]/15">
          <Icon name="database" className="text-[12px]" />
          {contextLabel} loaded
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {askAiMessages.length === 0 && (
          <div className="text-center text-stone-400 text-xs py-8">
            <Icon name="auto_awesome" className="text-[32px] block mx-auto mb-2 text-stone-300" />
            <p>Ask me anything about your projects.</p>
            <p className="mt-1">I can analyze data, suggest actions, and provide insights.</p>
          </div>
        )}
        {askAiMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-stone-100 text-stone-700 border border-stone-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-stone-400' : 'text-stone-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 border border-stone-200 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <div className="w-3 h-3 border-2 border-[#c41e3a] border-t-transparent rounded-full animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#1a1a1a]/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your projects..."
            className="flex-1 border border-[#1a1a1a]/15 px-3 py-2 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[#c41e3a] text-white hover:bg-[#c41e3a]/80 disabled:opacity-50"
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
