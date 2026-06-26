import useStore from '../../store/useStore';
import { daysUntil } from '../../lib/helpers';

export default function SummaryBar() {
  const projects = useStore((s) => s.projects);
  const milestones = useStore((s) => s.milestones);

  const active = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'on_hold'
  );
  const onTrack = active.filter((p) => p.status === 'on_track').length;
  const atRisk = active.filter((p) => p.status === 'at_risk').length;
  const offTrack = active.filter((p) => p.status === 'off_track').length;

  const overdueMilestones = milestones.filter((m) => {
    if (m.status === 'completed' || m.archivedAt) return false;
    const days = daysUntil(m.dueDate);
    return days !== null && days < 0;
  }).length;

  const cards = [
    {
      label: 'Total Projects',
      value: active.length,
      borderColor: 'border-[#1a1a1a]',
      textColor: 'text-[#1a1a1a]',
    },
    {
      label: 'On Track',
      value: onTrack,
      borderColor: 'border-[#15803d]',
      textColor: 'text-[#15803d]',
    },
    {
      label: 'At Risk',
      value: atRisk,
      borderColor: 'border-[#d97706]',
      textColor: 'text-[#d97706]',
    },
    {
      label: 'Off Track',
      value: offTrack,
      borderColor: 'border-[#c41e3a]',
      textColor: 'text-[#c41e3a]',
    },
    {
      label: 'Overdue Milestones',
      value: overdueMilestones,
      borderColor: 'border-[#c41e3a]',
      textColor: 'text-[#c41e3a]',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white border border-stone-200 border-l-4 ${card.borderColor} p-4`}
        >
          <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
            {card.label}
          </p>
          <p className={`text-2xl font-bold font-headline mt-1 ${card.textColor}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
