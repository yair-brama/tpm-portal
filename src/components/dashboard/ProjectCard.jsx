import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { statusLabel, statusColor, ragBg, formatDate, daysUntil } from '../../lib/helpers';
import Icon from '../layout/Icon';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();
  const milestones = useStore((s) => s.milestones);

  const projectMilestones = milestones.filter(
    (m) => m.projectId === project.id && !m.archivedAt
  );
  const completedMs = projectMilestones.filter(
    (m) => m.status === 'completed'
  ).length;
  const totalMs = projectMilestones.length;
  const progressPct = totalMs > 0 ? (completedMs / totalMs) * 100 : 0;

  // Next upcoming milestone
  const nextMilestone = projectMilestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];

  const ragColor = statusColor(project.status);
  const days = daysUntil(project.endDate);

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-headline font-bold text-[15px] text-[#1a1a1a] leading-snug group-hover:text-[#c41e3a] transition-colors">
            {project.name}
          </h3>
          <span
            className={`${ragBg(ragColor)} text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border shrink-0 ml-2`}
          >
            {statusLabel(project.status)}
          </span>
        </div>

        {/* Phase + Owner */}
        <div className="flex items-center gap-3 text-xs text-stone-400 mb-3">
          {project.phase && (
            <span className="flex items-center gap-1">
              <Icon name="flag" className="text-[14px]" />
              {project.phase}
            </span>
          )}
          {project.owner && (
            <span className="flex items-center gap-1">
              <Icon name="person" className="text-[14px]" />
              {project.owner}
            </span>
          )}
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3">
            <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium mb-1">
              Next Milestone
            </p>
            <p className="text-xs font-medium text-[#1a1a1a] truncate">
              {nextMilestone.name}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {formatDate(nextMilestone.dueDate)}
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-stone-400 mb-1">
            <span>Milestones</span>
            <span>
              {completedMs}/{totalMs}
            </span>
          </div>
          <div className="h-1.5 bg-stone-100 w-full">
            <div
              className="h-full bg-[#15803d] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 border border-stone-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-stone-100 flex items-center justify-between">
        <span className="text-[11px] text-stone-400">
          {days !== null
            ? days > 0
              ? `${days} days remaining`
              : days === 0
              ? 'Ends today'
              : `${Math.abs(days)} days past due`
            : ''}
        </span>
        <Icon
          name="arrow_forward"
          className="text-[16px] text-stone-300 group-hover:text-[#c41e3a] transition-colors"
        />
      </div>
    </div>
  );
}
