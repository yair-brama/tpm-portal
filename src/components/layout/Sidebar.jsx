import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';

const navItems = [
  { path: '/', label: 'Program Dashboard', icon: 'grid_view' },
  { path: '/program', label: 'Program', icon: 'account_tree' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 border-r border-[#1a1a1a]/10 bg-[#fdfcfb] flex flex-col min-h-screen">
      {/* Brand */}
      <div className="p-5 border-b border-[#1a1a1a]/10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-semibold">
          TPM Enterprise Suite
        </p>
        <h1 className="font-headline text-lg font-bold text-[#1a1a1a] mt-1 leading-tight">
          The Governance Desk
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-left ${
              isActive(item.path)
                ? 'bg-[#c41e3a]/8 text-[#c41e3a] border-r-2 border-[#c41e3a] font-medium'
                : 'text-stone-600 hover:bg-stone-100 hover:text-[#1a1a1a]'
            }`}
          >
            <Icon
              name={item.icon}
              className={`text-[20px] ${
                isActive(item.path) ? 'text-[#c41e3a]' : 'text-stone-400'
              }`}
            />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User block */}
      <div className="p-4 border-t border-[#1a1a1a]/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-bold">
          YB
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1a1a1a] truncate">
            Yair Brama
          </p>
          <p className="text-[11px] text-stone-400">Program Director</p>
        </div>
      </div>
    </aside>
  );
}
