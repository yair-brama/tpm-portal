import { useState } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import { formatDate } from '../../lib/helpers';

const MODELS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Best)' },
];

export default function SettingsView() {
  const aiModel = useStore((s) => s.aiModel);
  const setAiModel = useStore((s) => s.setAiModel);
  const aiApiKey = useStore((s) => s.aiApiKey);
  const setAiApiKey = useStore((s) => s.setAiApiKey);
  const discoveryTemplate = useStore((s) => s.discoveryTemplate);
  const setDiscoveryTemplate = useStore((s) => s.setDiscoveryTemplate);
  const resetDiscoveryTemplate = useStore((s) => s.resetDiscoveryTemplate);
  const lastSaved = useStore((s) => s.lastSavedAt);
  const folderConnected = useStore((s) => s.folderConnected);
  const initFromFile = useStore((s) => s.initFromFile);
  const [showKey, setShowKey] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({});

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setDiscoveryTemplate([
      ...discoveryTemplate,
      { name: newCatName.trim(), icon: 'checklist', hint: '', items: [] },
    ]);
    setNewCatName('');
  };

  const handleRemoveCategory = (idx) => {
    const updated = [...discoveryTemplate];
    updated.splice(idx, 1);
    setDiscoveryTemplate(updated);
  };

  const handleMoveCat = (idx, dir) => {
    const updated = [...discoveryTemplate];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= updated.length) return;
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setDiscoveryTemplate(updated);
  };

  const handleAddItem = (catIdx) => {
    const text = newItemTexts[catIdx]?.trim();
    if (!text) return;
    const updated = discoveryTemplate.map((cat, i) => {
      if (i !== catIdx) return cat;
      return { ...cat, items: [...cat.items, { text, checked: false, note: '' }] };
    });
    setDiscoveryTemplate(updated);
    setNewItemTexts({ ...newItemTexts, [catIdx]: '' });
  };

  const handleRemoveItem = (catIdx, itemIdx) => {
    const updated = discoveryTemplate.map((cat, i) => {
      if (i !== catIdx) return cat;
      return { ...cat, items: cat.items.filter((_, j) => j !== itemIdx) };
    });
    setDiscoveryTemplate(updated);
  };

  const handleEditItem = (catIdx, itemIdx, text) => {
    const updated = discoveryTemplate.map((cat, i) => {
      if (i !== catIdx) return cat;
      return {
        ...cat,
        items: cat.items.map((item, j) => (j === itemIdx ? { ...item, text } : item)),
      };
    });
    setDiscoveryTemplate(updated);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-headline text-2xl font-bold text-[#1a1a1a]">Settings</h1>

      {/* AI Configuration */}
      <section className="border border-[#1a1a1a]/10 p-5">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
          AI Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40 font-mono"
              />
              <button onClick={() => setShowKey(!showKey)} className="px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">
                <Icon name={showKey ? 'visibility_off' : 'visibility'} className="text-[16px]" />
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">Your API key is stored locally and never sent to our servers.</p>
          </div>
        </div>
      </section>

      {/* Discovery Template Editor */}
      <section className="border border-[#1a1a1a]/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-stone-400">
            Discovery Template Editor
          </h2>
          <button onClick={resetDiscoveryTemplate} className="text-xs text-[#c41e3a] hover:underline">
            Reset to Defaults
          </button>
        </div>

        <div className="space-y-2">
          {discoveryTemplate.map((cat, catIdx) => (
            <div key={catIdx} className="border border-[#1a1a1a]/5">
              <div className="flex items-center gap-2 p-3 bg-stone-50 cursor-pointer" onClick={() => setExpandedCat(expandedCat === catIdx ? null : catIdx)}>
                <Icon name={cat.icon || 'checklist'} className="text-[18px] text-stone-400" />
                <span className="flex-1 text-sm font-medium text-[#1a1a1a]">{cat.name}</span>
                <span className="text-xs text-stone-400">{cat.items.length} items</span>
                <button onClick={(e) => { e.stopPropagation(); handleMoveCat(catIdx, -1); }} className="text-stone-400 hover:text-stone-600" disabled={catIdx === 0}>
                  <Icon name="arrow_upward" className="text-[16px]" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleMoveCat(catIdx, 1); }} className="text-stone-400 hover:text-stone-600" disabled={catIdx === discoveryTemplate.length - 1}>
                  <Icon name="arrow_downward" className="text-[16px]" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveCategory(catIdx); }} className="text-stone-400 hover:text-[#c41e3a]">
                  <Icon name="delete" className="text-[16px]" />
                </button>
                <Icon name={expandedCat === catIdx ? 'expand_less' : 'expand_more'} className="text-[18px] text-stone-400" />
              </div>

              {expandedCat === catIdx && (
                <div className="p-3 space-y-1 border-t border-[#1a1a1a]/5">
                  {cat.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2 text-sm">
                      <span className="text-stone-400 w-4 text-center text-xs">{itemIdx + 1}</span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleEditItem(catIdx, itemIdx, e.target.value)}
                        className="flex-1 border border-transparent hover:border-[#1a1a1a]/10 px-2 py-0.5 text-sm bg-transparent focus:outline-none focus:border-[#c41e3a]/40"
                      />
                      <button onClick={() => handleRemoveItem(catIdx, itemIdx)} className="text-stone-400 hover:text-[#c41e3a]">
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newItemTexts[catIdx] || ''}
                      onChange={(e) => setNewItemTexts({ ...newItemTexts, [catIdx]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(catIdx)}
                      placeholder="Add item..."
                      className="flex-1 border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
                    />
                    <button onClick={() => handleAddItem(catIdx)} className="text-xs text-[#c41e3a] hover:underline">Add</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add category */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="New category name..."
              className="flex-1 border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
            />
            <button onClick={handleAddCategory} className="px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">
              Add Category
            </button>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="border border-[#1a1a1a]/10 p-5">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
          Data Management
        </h2>
        <div className="space-y-3">
          <button
            onClick={initFromFile}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80"
          >
            <Icon name="folder_open" className="text-[16px]" />
            Connect Folder
          </button>
          {folderConnected && (
            <p className="text-xs text-[#15803d]">
              <Icon name="check_circle" className="text-[14px] align-middle mr-1" />
              Folder connected
            </p>
          )}
          {lastSaved && (
            <p className="text-xs text-stone-400">
              Last saved: {new Date(lastSaved).toLocaleString()}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
