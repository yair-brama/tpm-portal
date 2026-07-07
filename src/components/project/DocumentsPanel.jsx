import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import {
  isFolderAccessSupported,
  pickProjectFolder,
  saveFolderHandle,
  getFolderHandle,
  removeFolderHandle,
  queryFolderPermission,
  requestFolderPermission,
} from '../../lib/folderHandles';
import { scanProjectFolder, readDocumentFile } from '../../lib/documentScan';
import { extractText, SUPPORTED_EXTENSIONS } from '../../lib/fileParsers';
import { summarizeDocument, generateProjectBrief, isAiReady } from '../../lib/ai';

const STATUS_CHIP = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  summarized: 'bg-[#15803d]/10 text-[#15803d] border-[#15803d]/15',
  removed: 'bg-stone-100 text-stone-400 border-stone-200 line-through',
};

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPanel({ project }) {
  const allDocuments = useStore((s) => s.documents);
  const setProjectDocuments = useStore((s) => s.setProjectDocuments);
  const updateDocument = useStore((s) => s.updateDocument);
  const projectBriefs = useStore((s) => s.projectBriefs);
  const setProjectBrief = useStore((s) => s.setProjectBrief);
  const allMilestones = useStore((s) => s.milestones);
  const allGoals = useStore((s) => s.goals);
  const allNotes = useStore((s) => s.notes);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const aiProvider = useStore((s) => s.aiProvider);
  const aiModel = useStore((s) => s.aiModel);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);

  const documents = useMemo(
    () => allDocuments.filter((d) => d.projectId === project.id).sort((a, b) => a.fileName.localeCompare(b.fileName)),
    [allDocuments, project.id]
  );
  const milestones = useMemo(() => allMilestones.filter((m) => m.projectId === project.id && !m.archivedAt), [allMilestones, project.id]);
  const goals = useMemo(() => allGoals.filter((g) => g.projectId === project.id), [allGoals, project.id]);
  const notes = useMemo(() => allNotes.filter((n) => n.projectId === project.id), [allNotes, project.id]);
  const brief = projectBriefs[project.id];

  const aiReady = isAiReady(aiProvider, aiApiKey);
  const aiConfig = { provider: aiProvider, apiKey: aiApiKey, model: aiModel, baseUrl: aiBaseUrl };

  // 'checking' | 'unsupported' | 'none' | 'needs-permission' | 'ready'
  const [folderState, setFolderState] = useState('checking');
  const handleRef = useRef(null);
  const [folderName, setFolderName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState(null);
  const [summarizeProgress, setSummarizeProgress] = useState(null);
  const [errors, setErrors] = useState([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);

  const summarizeNewDocs = useCallback(async (docs) => {
    if (!aiReady) return;
    const pending = docs.filter((d) => d.status === 'new');
    const failures = [];
    for (let i = 0; i < pending.length; i++) {
      const doc = pending[i];
      setSummarizeProgress({ current: i + 1, total: pending.length, fileName: doc.fileName });
      try {
        const file = await readDocumentFile(handleRef.current, doc.fileName);
        if (!file) throw new Error('file no longer in folder');
        const text = await extractText(file);
        const summary = await summarizeDocument(aiConfig, doc, text);
        updateDocument(doc.id, {
          summary,
          status: 'summarized',
          summarizedAt: new Date().toISOString(),
          extractedTextExcerpt: text.slice(0, 300),
        });
      } catch (err) {
        failures.push(`${doc.fileName}: ${err.message}`);
      }
    }
    setSummarizeProgress(null);
    if (failures.length > 0) setErrors((prev) => [...prev, ...failures]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiReady, aiProvider, aiApiKey, aiModel, aiBaseUrl, updateDocument]);

  const rescan = useCallback(async () => {
    if (!handleRef.current) return;
    setScanning(true);
    setErrors([]);
    setScanSummary(null);
    try {
      const currentDocs = useStore.getState().documents.filter((d) => d.projectId === project.id);
      const { documents: scanned, counts } = await scanProjectFolder(handleRef.current, project.id, currentDocs);
      setProjectDocuments(project.id, scanned);
      setScanSummary(counts);
      await summarizeNewDocs(scanned);
    } catch (err) {
      setErrors([`Scan failed: ${err.message}`]);
    }
    setScanning(false);
  }, [project.id, setProjectDocuments, summarizeNewDocs]);

  // On tab open: restore the stored handle and auto-rescan if permission holds
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFolderAccessSupported()) {
        setFolderState('unsupported');
        return;
      }
      const handle = await getFolderHandle(project.id);
      if (cancelled) return;
      if (!handle) {
        setFolderState('none');
        return;
      }
      handleRef.current = handle;
      setFolderName(handle.name);
      const permission = await queryFolderPermission(handle);
      if (cancelled) return;
      if (permission === 'granted') {
        setFolderState('ready');
        rescan();
      } else {
        setFolderState('needs-permission');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleConnect = async () => {
    const handle = await pickProjectFolder();
    if (!handle) return;
    await saveFolderHandle(project.id, handle);
    handleRef.current = handle;
    setFolderName(handle.name);
    setFolderState('ready');
    rescan();
  };

  const handleReconnect = async () => {
    const granted = await requestFolderPermission(handleRef.current);
    if (granted) {
      setFolderState('ready');
      rescan();
    }
  };

  const handleDisconnect = async () => {
    await removeFolderHandle(project.id);
    handleRef.current = null;
    setFolderName('');
    setFolderState('none');
  };

  const handleGenerateBrief = async () => {
    setBriefLoading(true);
    try {
      const result = await generateProjectBrief(aiConfig, project, milestones, goals, notes, documents);
      setProjectBrief(project.id, result);
    } catch (err) {
      setErrors((prev) => [...prev, `Brief generation failed: ${err.message}`]);
    }
    setBriefLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Documents</h2>
        {folderState === 'ready' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400">
              <Icon name="folder" className="text-[14px] align-middle mr-1" />
              {folderName}
            </span>
            <button
              onClick={rescan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80 disabled:opacity-50"
            >
              <Icon name="refresh" className="text-[16px]" />
              {scanning ? 'Scanning...' : 'Rescan'}
            </button>
            <button onClick={handleDisconnect} className="text-xs text-stone-400 hover:text-[#c41e3a]">
              Disconnect
            </button>
          </div>
        )}
      </div>

      {folderState === 'unsupported' && (
        <div className="border border-[#1a1a1a]/10 p-8 text-center text-sm text-stone-500">
          Folder monitoring needs the File System Access API, which this browser does not support.
          Use Chrome or Edge.
        </div>
      )}

      {folderState === 'none' && (
        <div className="border-2 border-dashed border-stone-300 p-10 text-center">
          <Icon name="create_new_folder" className="text-[40px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm text-stone-500 mb-4">
            Link a local folder for this project. Drop in docs and notes, and the app will scan and
            summarize them into a full picture of the project.
          </p>
          <p className="text-xs text-stone-400 mb-4">
            Supported now: {SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(', ')}
          </p>
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80 mx-auto"
          >
            <Icon name="folder_open" className="text-[16px]" />
            Connect Folder
          </button>
        </div>
      )}

      {folderState === 'needs-permission' && (
        <div className="border border-[#d97706]/30 bg-[#d97706]/5 p-4 flex items-center justify-between">
          <p className="text-sm text-[#d97706]">
            <Icon name="warning" className="text-[16px] align-middle mr-1.5" />
            Access to <strong>{folderName}</strong> needs to be re-granted before scanning.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReconnect}
              className="px-3 py-1.5 text-xs bg-[#d97706] text-white hover:bg-[#d97706]/80"
            >
              Reconnect folder
            </button>
            <button onClick={handleDisconnect} className="px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
              Unlink
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-xs text-[#c41e3a] space-y-0.5 border border-[#c41e3a]/20 bg-[#c41e3a]/5 p-3">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {folderState === 'ready' && (
        <>
          {(scanSummary || summarizeProgress) && (
            <div className="text-xs text-stone-500 flex items-center gap-4">
              {scanSummary && (
                <span>
                  Scan: {scanSummary.added} new, {scanSummary.changed} changed, {scanSummary.unchanged} unchanged,
                  {' '}{scanSummary.removed} removed{scanSummary.skipped > 0 ? `, ${scanSummary.skipped} unsupported skipped` : ''}
                </span>
              )}
              {summarizeProgress && (
                <span className="text-[#c41e3a]">
                  Summarizing {summarizeProgress.current}/{summarizeProgress.total}: {summarizeProgress.fileName}
                </span>
              )}
            </div>
          )}

          {!aiReady && documents.some((d) => d.status === 'new') && (
            <p className="text-xs text-[#d97706]">
              Configure an AI provider in Settings to summarize new documents.
            </p>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
              <Icon name="description" className="text-[40px] block mx-auto mb-2 text-stone-300" />
              <p className="text-sm">No supported files found in this folder yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10 text-xs uppercase tracking-wider text-stone-400">
                  <th className="py-2 text-left font-semibold">File</th>
                  <th className="py-2 text-left font-semibold">Size</th>
                  <th className="py-2 text-left font-semibold">Modified</th>
                  <th className="py-2 text-left font-semibold">Status</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    expanded={expandedDoc === doc.id}
                    onToggle={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Full picture brief */}
          <section className="border border-[#1a1a1a]/10 p-5 bg-[#f5f1eb]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-stone-400">
                Full Picture
              </h3>
              <div className="flex items-center gap-3">
                {brief?.generatedAt && (
                  <span className="text-xs text-stone-400">
                    Generated {new Date(brief.generatedAt).toLocaleString()}
                  </span>
                )}
                <button
                  onClick={handleGenerateBrief}
                  disabled={briefLoading || !aiReady}
                  title={aiReady ? '' : 'Configure an AI provider in Settings'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#c41e3a] text-white hover:bg-[#c41e3a]/80 disabled:opacity-50"
                >
                  <Icon name="auto_awesome" className="text-[16px]" />
                  {briefLoading ? 'Generating...' : brief ? 'Regenerate' : 'Generate Brief'}
                </button>
              </div>
            </div>
            {brief ? (
              <div className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{brief.text}</div>
            ) : (
              <p className="text-xs text-stone-400">
                Synthesizes milestones, goals, notes and the document summaries above into one narrative brief.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DocRow({ doc, expanded, onToggle }) {
  return (
    <>
      <tr className="border-b border-[#1a1a1a]/5 hover:bg-stone-50 cursor-pointer" onClick={onToggle}>
        <td className="py-2.5 font-medium text-[#1a1a1a]">
          <Icon name="description" className="text-[16px] align-middle mr-1.5 text-stone-400" />
          {doc.fileName}
        </td>
        <td className="py-2.5 text-stone-600">{formatBytes(doc.size)}</td>
        <td className="py-2.5 text-stone-600">
          {doc.lastModified ? new Date(doc.lastModified).toLocaleDateString() : '—'}
        </td>
        <td className="py-2.5">
          <span className={`text-[10px] px-1.5 py-0.5 border font-medium uppercase ${STATUS_CHIP[doc.status] || STATUS_CHIP.new}`}>
            {doc.status}
          </span>
        </td>
        <td className="py-2.5 text-stone-400">
          {doc.summary && <Icon name={expanded ? 'expand_less' : 'expand_more'} className="text-[18px]" />}
        </td>
      </tr>
      {expanded && doc.summary && (
        <tr className="border-b border-[#1a1a1a]/5 bg-stone-50">
          <td colSpan={5} className="py-3 px-4">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">
              AI Summary{doc.summarizedAt ? ` — ${new Date(doc.summarizedAt).toLocaleString()}` : ''}
            </p>
            <div className="text-sm text-stone-700 whitespace-pre-wrap">{doc.summary}</div>
          </td>
        </tr>
      )}
    </>
  );
}
