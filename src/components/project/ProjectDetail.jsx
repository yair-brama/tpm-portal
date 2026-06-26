import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import Icon from '../layout/Icon';
import OverviewTab from './OverviewTab';
import GoalsTab from './GoalsTab';
import MilestonesTab from './MilestonesTab';
import NotesTab from './NotesTab';
import StatusReportsTab from './StatusReportsTab';
import DiscoveryTab from './DiscoveryTab';
import RaciTab from './RaciTab';
import KpisTab from './KpisTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'info' },
  { key: 'goals', label: 'Goals', icon: 'flag' },
  { key: 'milestones', label: 'Milestones', icon: 'timeline' },
  { key: 'notes', label: 'Notes', icon: 'note' },
  { key: 'status_reports', label: 'Status Reports', icon: 'summarize' },
  { key: 'discovery', label: 'Discovery', icon: 'explore' },
  { key: 'raci', label: 'RACI Matrix', icon: 'grid_on' },
  { key: 'kpis', label: 'KPIs & SLAs', icon: 'monitoring' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const deleteProject = useStore((s) => s.deleteProject);
  const project = projects.find((p) => p.id === projectId);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p className="text-lg">Project not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-[#c41e3a] hover:underline text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab project={project} />;
      case 'goals':
        return <GoalsTab project={project} />;
      case 'milestones':
        return <MilestonesTab project={project} />;
      case 'notes':
        return <NotesTab project={project} />;
      case 'status_reports':
        return <StatusReportsTab project={project} />;
      case 'discovery':
        return <DiscoveryTab project={project} />;
      case 'raci':
        return <RaciTab project={project} />;
      case 'kpis':
        return <KpisTab project={project} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-[#1a1a1a] mb-6"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back to Dashboard
      </button>

      <div className="flex gap-8">
        {/* Left sidebar tabs */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#c41e3a]/8 text-[#c41e3a] border-l-2 border-[#c41e3a] font-medium'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-[#1a1a1a] border-l-2 border-transparent'
                }`}
              >
                <Icon
                  name={tab.icon}
                  className={`text-[18px] ${
                    activeTab === tab.key ? 'text-[#c41e3a]' : 'text-stone-400'
                  }`}
                />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Delete project */}
          <div className="mt-6 pt-4 border-t border-[#1a1a1a]/10">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-[#c41e3a] font-medium">Delete "{project.name}" and all its data?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { deleteProject(project.id); navigate('/'); }}
                    className="px-3 py-1.5 text-xs bg-[#c41e3a] text-white hover:bg-[#c41e3a]/80"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs border border-[#1a1a1a]/15 text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-[#c41e3a] transition-colors"
              >
                <Icon name="delete" className="text-[16px]" />
                Delete Project
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">{renderTab()}</div>
      </div>
    </div>
  );
}
