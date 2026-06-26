import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { computeAlerts } from '../../lib/alerts';
import { formatDate } from '../../lib/helpers';
import Icon from '../layout/Icon';

export default function MorningSummary() {
  const [collapsed, setCollapsed] = useState(false);
  const projects = useStore((s) => s.projects);
  const milestones = useStore((s) => s.milestones);
  const statusReports = useStore((s) => s.statusReports);
  const kpis = useStore((s) => s.kpis);

  const alerts = useMemo(
    () => computeAlerts(projects, milestones, statusReports, kpis),
    [projects, milestones, statusReports, kpis]
  );

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const totalAlerts =
    (alerts.overdue?.length || 0) +
    (alerts.dueThisWeek?.length || 0) +
    (alerts.blocked?.length || 0) +
    (alerts.missingReport?.length || 0);

  if (totalAlerts === 0) return null;

  return (
    <div className="bg-white border border-stone-200 mb-6 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="notifications" className="text-[20px] text-[#c41e3a]" />
          <h2 className="font-headline font-bold text-sm text-[#1a1a1a]">
            Morning Summary
          </h2>
          <span className="text-xs text-stone-400 font-serif italic">
            {dayName}, {dateStr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-[#c41e3a] text-white px-2 py-0.5 font-medium">
            {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
          </span>
          <Icon
            name={collapsed ? 'expand_more' : 'expand_less'}
            className="text-[20px] text-stone-400"
          />
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overdue Milestones */}
          {alerts.overdue?.length > 0 && (
            <AlertSection
              title="Overdue Milestones"
              icon="error"
              color="red"
              items={alerts.overdue.map((a) => ({
                primary: a.milestoneName,
                secondary: a.projectName,
                badge: `${a.daysOverdue}d overdue`,
              }))}
            />
          )}

          {/* Due This Week */}
          {alerts.dueThisWeek?.length > 0 && (
            <AlertSection
              title="Due This Week"
              icon="schedule"
              color="amber"
              items={alerts.dueThisWeek.map((a) => ({
                primary: a.milestoneName,
                secondary: a.projectName,
                badge:
                  a.daysUntil === 0
                    ? 'Today'
                    : `${a.daysUntil}d left`,
              }))}
            />
          )}

          {/* Blocked */}
          {alerts.blocked?.length > 0 && (
            <AlertSection
              title="Blocked"
              icon="block"
              color="red"
              items={alerts.blocked.map((a) => ({
                primary: a.milestoneName,
                secondary: a.projectName,
              }))}
            />
          )}

          {/* Missing Status Report */}
          {alerts.missingReport?.length > 0 && (
            <AlertSection
              title="Missing Status Report"
              icon="draft"
              color="blue"
              items={alerts.missingReport.map((a) => ({
                primary: a.projectName,
                secondary: a.lastReportDate
                  ? `Last: ${formatDate(a.lastReportDate.slice(0, 10))}`
                  : 'No reports',
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AlertSection({ title, icon, color, items }) {
  const colorMap = {
    red: {
      bg: 'bg-red-50',
      border: 'border-[#c41e3a]/15',
      icon: 'text-[#c41e3a]',
      badge: 'bg-[#c41e3a]/10 text-[#c41e3a]',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-[#d97706]/15',
      icon: 'text-[#d97706]',
      badge: 'bg-[#d97706]/10 text-[#d97706]',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  const c = colorMap[color] || colorMap.red;

  return (
    <div className={`${c.bg} border ${c.border} p-3`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon name={icon} className={`text-[16px] ${c.icon}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          {title}
        </h3>
        <span className="text-[10px] text-stone-400 ml-auto">
          {items.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="font-medium text-[#1a1a1a] truncate block">
                {item.primary}
              </span>
              {item.secondary && (
                <span className="text-stone-400">{item.secondary}</span>
              )}
            </div>
            {item.badge && (
              <span
                className={`${c.badge} text-[10px] px-1.5 py-0.5 font-medium shrink-0 ml-2`}
              >
                {item.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
