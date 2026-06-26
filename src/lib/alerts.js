import { kpiRag } from './helpers.js';

/**
 * Compute morning summary alerts from current portal data.
 * No AI, no network — pure calculation from tpm-data.json contents.
 *
 * @param {Array} projects - All projects
 * @param {Array} milestones - All milestones
 * @param {Array} reports - All status reports
 * @param {Array} kpis - All KPIs (project + program level)
 * @param {Array} dataImports - All data import records
 * @param {Object} discoveryState - Discovery state keyed by projectId
 * @returns {Object} Alert groups
 */
export function computeAlerts(projects, milestones, reports, kpis, dataImports = [], discoveryState = {}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 86400000;

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'on_hold');
  const activeMilestones = milestones.filter(m => !m.archivedAt);

  // Overdue milestones: dueDate < today and status != completed
  const overdue = activeMilestones
    .filter(m => {
      if (m.status === 'completed') return false;
      if (!m.dueDate) return false;
      const due = new Date(m.dueDate + 'T00:00:00');
      return due < today;
    })
    .map(m => {
      const project = projects.find(p => p.id === m.projectId);
      const daysPast = Math.ceil((today - new Date(m.dueDate + 'T00:00:00')) / msPerDay);
      return {
        projectId: m.projectId,
        projectName: project?.name || 'Unknown',
        milestoneId: m.id,
        milestoneName: m.name,
        dueDate: m.dueDate,
        daysOverdue: daysPast,
        severity: 'red',
      };
    });

  // Due this week: dueDate within 7 days from today (and not completed)
  const sevenDaysOut = new Date(today.getTime() + 7 * msPerDay);
  const dueThisWeek = activeMilestones
    .filter(m => {
      if (m.status === 'completed') return false;
      if (!m.dueDate) return false;
      const due = new Date(m.dueDate + 'T00:00:00');
      return due >= today && due <= sevenDaysOut;
    })
    .map(m => {
      const project = projects.find(p => p.id === m.projectId);
      const daysLeft = Math.ceil((new Date(m.dueDate + 'T00:00:00') - today) / msPerDay);
      return {
        projectId: m.projectId,
        projectName: project?.name || 'Unknown',
        milestoneId: m.id,
        milestoneName: m.name,
        dueDate: m.dueDate,
        daysUntil: daysLeft,
        severity: 'amber',
      };
    });

  // Blocked milestones
  const blocked = activeMilestones
    .filter(m => m.isBlocked)
    .map(m => {
      const project = projects.find(p => p.id === m.projectId);
      return {
        projectId: m.projectId,
        projectName: project?.name || 'Unknown',
        milestoneId: m.id,
        milestoneName: m.name,
        severity: 'red',
      };
    });

  // Missing status report: no report in > 7 days for active projects
  const missingReport = activeProjects
    .filter(p => {
      const projectReports = reports.filter(r => r.projectId === p.id);
      if (projectReports.length === 0) return true;
      const latest = projectReports.reduce((a, b) =>
        new Date(a.generatedAt) > new Date(b.generatedAt) ? a : b
      );
      const daysSince = Math.ceil((now - new Date(latest.generatedAt)) / msPerDay);
      return daysSince > 7;
    })
    .map(p => {
      const projectReports = reports.filter(r => r.projectId === p.id);
      const lastReport = projectReports.length > 0
        ? projectReports.reduce((a, b) => new Date(a.generatedAt) > new Date(b.generatedAt) ? a : b)
        : null;
      return {
        projectId: p.id,
        projectName: p.name,
        lastReportDate: lastReport?.generatedAt || null,
        severity: 'blue',
      };
    });

  // Stale milestone data: last import > 14 days ago
  const staleData = activeProjects
    .filter(p => {
      const projectImports = dataImports.filter(i => i.projectId === p.id);
      if (projectImports.length === 0) {
        // No imports ever — check if project has milestones
        const projectMs = milestones.filter(m => m.projectId === p.id);
        return projectMs.length > 0; // Only flag if there are milestones to be stale
      }
      const latest = projectImports.reduce((a, b) =>
        new Date(a.importedAt) > new Date(b.importedAt) ? a : b
      );
      const daysSince = Math.ceil((now - new Date(latest.importedAt)) / msPerDay);
      return daysSince > 14;
    })
    .map(p => ({
      projectId: p.id,
      projectName: p.name,
      severity: 'amber',
    }));

  // SLA breached: any KPI with type=sla whose currentValue violates target, or open breach entries
  const slaBreached = kpis
    .filter(k => {
      if (k.type !== 'sla') return false;
      // Check if current value violates
      const rag = kpiRag(k);
      if (rag === 'red') return true;
      // Check for open breach log entries
      if (k.breachLog && k.breachLog.some(b => !b.resolved)) return true;
      return false;
    })
    .map(k => {
      const project = k.projectId ? projects.find(p => p.id === k.projectId) : null;
      const openBreaches = (k.breachLog || []).filter(b => !b.resolved).length;
      return {
        kpiId: k.id,
        kpiName: k.name,
        projectId: k.projectId,
        projectName: project?.name || 'Program',
        currentValue: k.currentValue,
        target: k.target,
        openBreaches,
        severity: 'red',
      };
    });

  // KPIs at risk: any KPI currently at amber threshold
  const kpisAtRisk = kpis
    .filter(k => kpiRag(k) === 'amber')
    .map(k => {
      const project = k.projectId ? projects.find(p => p.id === k.projectId) : null;
      return {
        kpiId: k.id,
        kpiName: k.name,
        projectId: k.projectId,
        projectName: project?.name || 'Program',
        currentValue: k.currentValue,
        target: k.target,
        severity: 'amber',
      };
    });

  // Stale manual KPIs: manual KPI whose last history entry is older than one interval
  const intervalDays = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
  const staleKpis = kpis
    .filter(k => {
      if (k.source !== 'manual') return false;
      if (!k.history || k.history.length === 0) return true; // Never recorded
      const lastEntry = k.history[k.history.length - 1];
      const lastDate = new Date(lastEntry.date + 'T00:00:00');
      const threshold = intervalDays[k.interval] || 7;
      const daysSince = Math.ceil((now - lastDate) / msPerDay);
      return daysSince > threshold;
    })
    .map(k => {
      const project = k.projectId ? projects.find(p => p.id === k.projectId) : null;
      return {
        kpiId: k.id,
        kpiName: k.name,
        projectId: k.projectId,
        projectName: project?.name || 'Program',
        interval: k.interval,
        severity: 'amber',
      };
    });

  // Incomplete discovery: < 50% complete on projects active > 14 days
  const incompleteDiscovery = activeProjects
    .filter(p => {
      if (!p.createdAt) return false;
      const daysSinceCreated = Math.ceil((now - new Date(p.createdAt)) / msPerDay);
      if (daysSinceCreated <= 14) return false;
      const disc = discoveryState[p.id];
      if (!disc) return true; // No discovery started
      let total = 0, checked = 0;
      disc.forEach(cat => {
        cat.items.forEach(item => {
          total++;
          if (item.checked) checked++;
        });
      });
      return total > 0 && (checked / total) < 0.5;
    })
    .map(p => ({
      projectId: p.id,
      projectName: p.name,
      severity: 'blue',
    }));

  return {
    overdue,
    dueThisWeek,
    blocked,
    missingReport,
    staleData,
    slaBreached,
    kpisAtRisk,
    staleKpis,
    incompleteDiscovery,
  };
}
