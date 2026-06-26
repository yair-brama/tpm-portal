import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import Modal from '../shared/Modal';
import { formatDate } from '../../lib/helpers';

export default function NotesTab({ project }) {
  const allNotes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const notes = useMemo(() => allNotes.filter((n) => n.projectId === project.id), [allNotes, project.id]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...notes]
      .filter((n) => !q || n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || (n.tags || []).some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notes, search]);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    addNote({
      title: form.title,
      content: form.content,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      projectId: project.id,
      source: 'typed',
    });
    setForm({ title: '', content: '', tags: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-[#1a1a1a]">Notes</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">
          <Icon name="add" className="text-[16px]" />
          Add Note
        </button>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-10 pr-3 py-2 border border-[#1a1a1a]/15 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Icon name="note" className="text-[48px] block mx-auto mb-3 text-stone-300" />
          <p className="text-sm">{search ? 'No notes match your search' : 'No notes yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <div key={note.id} className="border border-[#1a1a1a]/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-[#1a1a1a]">{note.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-400">{formatDate(note.createdAt?.split('T')[0])}</span>
                    <span className={`text-xs px-1.5 py-0.5 border ${note.source === 'uploaded' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                      {note.source === 'uploaded' ? 'Uploaded' : 'Typed'}
                    </span>
                  </div>
                </div>
              </div>
              {note.content && <p className="text-xs text-stone-600 mt-2 line-clamp-3 whitespace-pre-wrap">{note.content}</p>}
              {(note.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#c41e3a]/8 text-[#c41e3a] border border-[#c41e3a]/15">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Note" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" autoFocus />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Write your note here... You can also paste content from uploaded files." className="w-full border border-[#1a1a1a]/15 px-3 py-2 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. meeting, decision, risk" className="w-full border border-[#1a1a1a]/15 px-3 py-1.5 text-sm bg-[#fdfcfb] focus:outline-none focus:border-[#c41e3a]/40" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSubmit} className="px-4 py-1.5 text-xs bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80">Add Note</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
