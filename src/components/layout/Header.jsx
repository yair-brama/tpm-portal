import useStore from '../../store/useStore';
import Icon from './Icon';

export default function Header() {
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setAskAiOpen = useStore((s) => s.setAskAiOpen);
  const projects = useStore((s) => s.projects);

  const activeCount = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'on_hold'
  ).length;

  return (
    <header className="h-14 border-b border-[#1a1a1a]/10 bg-[#fdfcfb] flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1.5 w-72">
        <Icon name="search" className="text-[18px] text-stone-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-stone-400 text-[#1a1a1a]"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Active projects count */}
        <span className="text-xs text-stone-400">
          {activeCount} active project{activeCount !== 1 ? 's' : ''}
        </span>

        {/* Ask AI button */}
        <button
          onClick={() => setAskAiOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#333] transition-colors"
        >
          <Icon name="auto_awesome" className="text-[16px]" />
          Ask AI
        </button>
      </div>
    </header>
  );
}
