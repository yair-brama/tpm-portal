import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';

export default function DiscoveryTab({ project }) {
  const toggleDiscoveryCheck = useStore((s) => s.toggleDiscoveryCheck);
  const setDiscoveryNote = useStore((s) => s.setDiscoveryNote);
  const addCustomDiscoveryItem = useStore((s) => s.addCustomDiscoveryItem);
  const toggleDiscoveryCategory = useStore((s) => s.toggleDiscoveryCategory);
  const initDiscovery = useStore((s) => s.initDiscovery);
  const discovery = useStore((s) => s.discoveryState[project.id] || null);

  useEffect(() => {
    initDiscovery(project.id);
  }, [project.id, initDiscovery]);
  const [customInputs, setCustomInputs] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Compute overall progress
  let total = 0;
  let checked = 0;
  (discovery || []).forEach((cat) => {
    cat.items.forEach((item) => {
      total++;
      if (item.checked) checked++;
    });
  });
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  const handleAddCustom = (catIdx) => {
    const text = customInputs[catIdx]?.trim();
    if (!text) return;
    addCustomDiscoveryItem(project.id, catIdx, text);
    setCustomInputs({ ...customInputs, [catIdx]: '' });
  };

  const handleStartNote = (catIdx, itemIdx, currentNote) => {
    setEditingNote({ catIdx, itemIdx });
    setNoteDraft(currentNote || '');
  };

  const handleSaveNote = () => {
    if (!editingNote) return;
    setDiscoveryNote(project.id, editingNote.catIdx, editingNote.itemIdx, noteDraft);
    setEditingNote(null);
    setNoteDraft('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Discovery Checklist</h2>
        <p className="text-sm text-stone-500 mt-1">Track project discovery activities across key areas.</p>
      </div>

      {/* Overall progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-stone-200">
          <div className="h-full bg-[#15803d] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-stone-600 w-20 text-right">{checked} / {total}</span>
      </div>

      {/* Category sections */}
      {(discovery || []).map((cat, catIdx) => {
        const catChecked = cat.items.filter((i) => i.checked).length;
        const catTotal = cat.items.length;
        const catPct = catTotal > 0 ? Math.round((catChecked / catTotal) * 100) : 0;

        return (
          <div key={catIdx} className="border border-[#1a1a1a]/10">
            {/* Category header */}
            <button
              onClick={() => toggleDiscoveryCategory(project.id, catIdx)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-stone-50 transition-colors"
            >
              <Icon name={cat.icon || 'checklist'} className="text-[20px] text-stone-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-[#1a1a1a]">{cat.name}</h3>
                  <span className="text-xs text-stone-400">{catChecked}/{catTotal}</span>
                </div>
                {cat.hint && <p className="text-xs text-stone-400 mt-0.5">{cat.hint}</p>}
              </div>
              <div className="w-20 h-1.5 bg-stone-200 flex-shrink-0">
                <div className="h-full bg-[#15803d] transition-all" style={{ width: `${catPct}%` }} />
              </div>
              <Icon name={cat.collapsed ? 'expand_more' : 'expand_less'} className="text-[18px] text-stone-400" />
            </button>

            {/* Items */}
            {!cat.collapsed && (
              <div className="border-t border-[#1a1a1a]/5 px-4 pb-4">
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-3 py-2 border-b border-[#1a1a1a]/5 last:border-0">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleDiscoveryCheck(project.id, catIdx, itemIdx)}
                      className="mt-0.5 w-4 h-4 accent-[#15803d]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${item.checked ? 'text-stone-400 line-through' : 'text-[#1a1a1a]'}`}>
                        {item.text}
                      </span>
                      {item.note && (
                        <p className="text-xs text-stone-400 mt-0.5 italic">{item.note}</p>
                      )}
                      {editingNote && editingNote.catIdx === catIdx && editingNote.itemIdx === itemIdx ? (
                        <div className="mt-1 flex gap-2">
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                            placeholder="Add a note..."
                            className="flex-1 border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
                            autoFocus
                          />
                          <button onClick={handleSaveNote} className="text-xs text-[#15803d] hover:underline">Save</button>
                          <button onClick={() => setEditingNote(null)} className="text-xs text-stone-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        !item.checked && !item.note && (
                          <button
                            onClick={() => handleStartNote(catIdx, itemIdx, item.note)}
                            className="text-[10px] text-[#c41e3a] hover:underline mt-0.5"
                          >
                            Add note
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}

                {/* Add custom item */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customInputs[catIdx] || ''}
                    onChange={(e) => setCustomInputs({ ...customInputs, [catIdx]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom(catIdx)}
                    placeholder="Add custom item..."
                    className="flex-1 border border-[#1a1a1a]/15 px-2 py-1 text-xs bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40"
                  />
                  <button onClick={() => handleAddCustom(catIdx)} className="text-xs text-[#c41e3a] hover:underline">Add</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
