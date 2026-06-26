import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import SummaryBar from './SummaryBar';
import MorningSummary from './MorningSummary';
import ProjectCard from './ProjectCard';
import Modal from '../shared/Modal';
import Icon from '../layout/Icon';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'on_track', label: 'On Track' },
  { key: 'at_risk', label: 'At Risk' },
  { key: 'off_track', label: 'Off Track' },
];

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewProject, setShowNewProject] = useState(false);

  const projects = useStore((s) => s.projects);
  const searchQuery = useStore((s) => s.searchQuery);
  const addProject = useStore((s) => s.addProject);

  const filteredProjects = useMemo(() => {
    let result = projects.filter(
      (p) => p.status !== 'completed' && p.status !== 'on_hold'
    );

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.owner?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [projects, statusFilter, searchQuery]);

  return (
    <div>
      <SummaryBar />
      <MorningSummary />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        {/* Status filter buttons */}
        <div className="flex items-center gap-1">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* New Project button */}
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c41e3a] text-white text-xs font-medium hover:bg-[#a31830] transition-colors"
        >
          <Icon name="add" className="text-[16px]" />
          New Project
        </button>
      </div>

      {/* Project grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-stone-400">
          <Icon name="folder_off" className="text-[40px] mb-2" />
          <p className="text-sm">No projects found</p>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onAdd={addProject}
        />
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [phase, setPhase] = useState('Initiation');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProject = {
      id: crypto.randomUUID(),
      name: name.trim(),
      owner: owner.trim() || undefined,
      phase,
      status: 'on_track',
      startDate: new Date().toISOString().slice(0, 10),
      tags: [],
      createdAt: new Date().toISOString(),
    };

    onAdd(newProject);
    onClose();
  };

  return (
    <Modal title="New Project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cloud Migration Phase 2"
            className="w-full border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c41e3a] transition-colors bg-white"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
            Owner
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="w-full border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c41e3a] transition-colors bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
            Phase
          </label>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="w-full border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c41e3a] bg-white"
          >
            <option>Initiation</option>
            <option>Planning</option>
            <option>Execution</option>
            <option>Monitoring</option>
            <option>Closure</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-stone-300 text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-[#c41e3a] text-white hover:bg-[#a31830] transition-colors"
          >
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
