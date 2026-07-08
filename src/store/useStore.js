import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { writeData, openFolder, readData, isFileSystemAvailable } from './persistence';

// --- Discovery Template (from spec section 8.3) ---

export const DISCOVERY_TEMPLATE = [
  {
    name: 'Scope & Goals',
    items: [
      { text: 'Project charter or brief reviewed', checked: false, note: '' },
      { text: 'Business objectives documented', checked: false, note: '' },
      { text: 'Success metrics defined', checked: false, note: '' },
      { text: 'Out-of-scope items documented', checked: false, note: '' },
      { text: 'MVP vs full scope formally agreed by stakeholders', checked: false, note: '' },
    ],
  },
  {
    name: 'Stakeholders',
    items: [
      { text: 'All key stakeholders identified and documented', checked: false, note: '' },
      { text: 'Executive sponsor confirmed', checked: false, note: '' },
      { text: 'Communication cadence agreed', checked: false, note: '' },
      { text: 'RACI or DRI model defined for key decisions', checked: false, note: '' },
    ],
  },
  {
    name: 'Timeline & Milestones',
    items: [
      { text: 'High-level milestones defined and imported', checked: false, note: '' },
      { text: 'Target launch date agreed and assessed for credibility', checked: false, note: '' },
      { text: 'Critical path identified', checked: false, note: '' },
    ],
  },
  {
    name: 'Resources & Budget',
    items: [
      { text: 'Budget approved and amount known', checked: false, note: '' },
      { text: 'Team roster confirmed — no pending departures', checked: false, note: '' },
      { text: 'Tools and infrastructure costs accounted for', checked: false, note: '' },
    ],
  },
  {
    name: 'Risks & Unknowns',
    items: [
      { text: 'Top risks documented with owners', checked: false, note: '' },
      { text: 'Key technical unknowns listed', checked: false, note: '' },
      { text: 'Mitigation plans in place for top 3 risks', checked: false, note: '' },
    ],
  },
  {
    name: 'Current State Assessment',
    items: [
      { text: 'Existing documentation reviewed (PRDs, design docs, ADRs)', checked: false, note: '' },
      { text: 'What\'s been shipped vs. what remains — independently verified', checked: false, note: '' },
      { text: 'Timeline credibility assessed — is the schedule actually realistic?', checked: false, note: '' },
      { text: 'Known technical debt and its impact on delivery documented', checked: false, note: '' },
    ],
  },
  {
    name: 'Existing Commitments',
    items: [
      { text: 'Decisions already made and locked in — documented with rationale', checked: false, note: '' },
      { text: 'External commitments identified (customer promises, exec announcements, contracts)', checked: false, note: '' },
      { text: 'Decisions still open and pending — who owns them?', checked: false, note: '' },
      { text: 'Vendor or partner dependencies identified', checked: false, note: '' },
    ],
  },
  {
    name: 'Team & Dynamics',
    items: [
      { text: '1:1s completed with all key engineering leads and stakeholders', checked: false, note: '' },
      { text: 'Pending team changes noted (departures, new hires, role changes)', checked: false, note: '' },
      { text: 'Team morale and health assessed — any burnout or friction?', checked: false, note: '' },
      { text: 'Team\'s own assessment of project health — does it match yours?', checked: false, note: '' },
    ],
  },
  {
    name: 'Handoff Quality (skip if not inheriting)',
    items: [
      { text: 'Briefing with previous TPM completed — open issues transferred', checked: false, note: '' },
      { text: 'All access and permissions obtained (tools, repos, dashboards, calendars)', checked: false, note: '' },
      { text: 'Stakeholders notified of TPM change — introductions made', checked: false, note: '' },
    ],
  },
];

// --- Seed Data ---

const SEED_PROJECTS = [
  {
    id: 'p1',
    name: 'Auth Migration v4',
    description: 'Migrate authentication system from legacy LDAP to OAuth 2.0 / OIDC with a new identity provider. Includes SSO for all internal tools and customer-facing apps.',
    status: 'at_risk',
    phase: 'Build',
    startDate: '2026-04-01',
    targetDate: '2026-08-15',
    owner: 'Yair B.',
    stakeholders: ['Marcus T.', 'Dana L.', 'Eng Team', 'DevOps', 'Security'],
    tags: ['infra', 'security', 'Q3'],
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-06-20T14:30:00Z',
  },
  {
    id: 'p2',
    name: 'Platform Observability',
    description: 'Implement unified observability stack: distributed tracing, structured logging, and metrics dashboards across all microservices.',
    status: 'on_track',
    phase: 'Build',
    startDate: '2026-05-01',
    targetDate: '2026-09-30',
    owner: 'Yair B.',
    stakeholders: ['DevOps', 'SRE Team', 'Eng Leads'],
    tags: ['infra', 'observability', 'Q3'],
    createdAt: '2026-05-01T08:00:00Z',
    updatedAt: '2026-06-18T10:00:00Z',
  },
  {
    id: 'p3',
    name: 'Customer Portal Redesign',
    description: 'Redesign the customer-facing portal with new UX, accessibility compliance (WCAG 2.1 AA), and mobile-first responsive layout.',
    status: 'on_track',
    phase: 'Planning',
    startDate: '2026-06-01',
    targetDate: '2026-11-15',
    owner: 'Yair B.',
    stakeholders: ['Product Team', 'UX Design', 'Frontend Eng', 'QA'],
    tags: ['customer-facing', 'UX', 'Q4'],
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-15T09:00:00Z',
  },
  {
    id: 'p4',
    name: 'Data Pipeline Modernization',
    description: 'Replace batch ETL pipelines with streaming architecture using Kafka and Flink. Enable real-time analytics for business dashboards.',
    status: 'on_hold',
    phase: 'Discovery',
    startDate: '2026-06-15',
    targetDate: '2027-01-31',
    owner: 'Yair B.',
    stakeholders: ['Data Eng', 'Analytics', 'Infra'],
    tags: ['data', 'infra', 'Q4'],
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-15T08:00:00Z',
  },
];

const SEED_MILESTONES = [
  // Auth Migration (p1) — 6 milestones
  { id: 'm1', projectId: 'p1', name: 'OAuth 2.0 spec finalized', dueDate: '2026-05-20', completedDate: '2026-05-19', status: 'completed', notes: '', assignees: ['Eng Team'], predecessorNames: [], predecessorIds: [], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  { id: 'm2', projectId: 'p1', name: 'IdP selected & contracted', dueDate: '2026-05-28', completedDate: '2026-05-27', status: 'completed', notes: '', assignees: ['Marcus T.', 'Yair B.'], predecessorNames: ['OAuth 2.0 spec finalized'], predecessorIds: ['m1'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  { id: 'm3', projectId: 'p1', name: 'Dev environment deployed', dueDate: '2026-06-10', completedDate: '2026-06-09', status: 'completed', notes: '', assignees: ['DevOps'], predecessorNames: ['IdP selected & contracted'], predecessorIds: ['m2'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  { id: 'm4', projectId: 'p1', name: 'Security review & pen testing', dueDate: '2026-06-25', completedDate: null, status: 'in_progress', notes: 'Pen test vendor confirmed', assignees: ['Security', 'Dana L.'], predecessorNames: ['Dev environment deployed'], predecessorIds: ['m3'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  { id: 'm5', projectId: 'p1', name: 'Staging validation', dueDate: '2026-06-18', completedDate: null, status: 'delayed', notes: 'Blocked on staging reprovisioning', assignees: ['DevOps'], predecessorNames: ['Dev environment deployed'], predecessorIds: ['m3'], isBlocked: true, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  { id: 'm6', projectId: 'p1', name: 'Load testing complete', dueDate: '2026-07-08', completedDate: null, status: 'in_progress', notes: 'Staging env fix needed', assignees: ['DevOps', 'Eng Team'], predecessorNames: ['Security review & pen testing'], predecessorIds: ['m4'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-10T10:00:00Z', archivedAt: null },
  // Platform Observability (p2) — 4 milestones
  { id: 'm7', projectId: 'p2', name: 'Tracing SDK integrated', dueDate: '2026-06-15', completedDate: '2026-06-14', status: 'completed', notes: '', assignees: ['SRE Team'], predecessorNames: [], predecessorIds: [], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-15T10:00:00Z', archivedAt: null },
  { id: 'm8', projectId: 'p2', name: 'Logging pipeline deployed', dueDate: '2026-07-01', completedDate: null, status: 'in_progress', notes: '', assignees: ['DevOps'], predecessorNames: ['Tracing SDK integrated'], predecessorIds: ['m7'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-15T10:00:00Z', archivedAt: null },
  { id: 'm9', projectId: 'p2', name: 'Metrics dashboards built', dueDate: '2026-07-20', completedDate: null, status: 'upcoming', notes: '', assignees: ['SRE Team', 'Eng Leads'], predecessorNames: ['Logging pipeline deployed'], predecessorIds: ['m8'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-15T10:00:00Z', archivedAt: null },
  { id: 'm10', projectId: 'p2', name: 'Alert rules configured', dueDate: '2026-08-05', completedDate: null, status: 'upcoming', notes: '', assignees: ['SRE Team'], predecessorNames: ['Metrics dashboards built'], predecessorIds: ['m9'], isBlocked: false, notInLatestImport: false, lastImportedAt: '2026-06-15T10:00:00Z', archivedAt: null },
  // Customer Portal (p3) — 3 milestones
  { id: 'm11', projectId: 'p3', name: 'UX research complete', dueDate: '2026-07-01', completedDate: null, status: 'in_progress', notes: 'User interviews ongoing', assignees: ['UX Design'], predecessorNames: [], predecessorIds: [], isBlocked: false, notInLatestImport: false, lastImportedAt: null, archivedAt: null },
  { id: 'm12', projectId: 'p3', name: 'Design system finalized', dueDate: '2026-07-25', completedDate: null, status: 'upcoming', notes: '', assignees: ['UX Design', 'Frontend Eng'], predecessorNames: ['UX research complete'], predecessorIds: ['m11'], isBlocked: false, notInLatestImport: false, lastImportedAt: null, archivedAt: null },
  { id: 'm13', projectId: 'p3', name: 'Accessibility audit passed', dueDate: '2026-09-15', completedDate: null, status: 'upcoming', notes: '', assignees: ['QA', 'Frontend Eng'], predecessorNames: ['Design system finalized'], predecessorIds: ['m12'], isBlocked: false, notInLatestImport: false, lastImportedAt: null, archivedAt: null },
  // Data Pipeline (p4) — 1 milestone
  { id: 'm14', projectId: 'p4', name: 'Architecture proposal reviewed', dueDate: '2026-07-15', completedDate: null, status: 'upcoming', notes: '', assignees: ['Data Eng', 'Infra'], predecessorNames: [], predecessorIds: [], isBlocked: false, notInLatestImport: false, lastImportedAt: null, archivedAt: null },
];

const SEED_GOALS = [
  { id: 'g1', projectId: 'p1', title: 'Zero-downtime migration for all users', description: 'Complete auth migration without any user-facing downtime or forced re-authentication', successMetric: 'Zero P1 incidents during migration window', status: 'in_progress', dueDate: '2026-08-15', createdAt: '2026-04-05T08:00:00Z' },
  { id: 'g2', projectId: 'p1', title: 'SSO coverage for all internal tools', description: 'All internal tools support SSO via the new IdP', successMetric: '100% of internal tools integrated with new IdP', status: 'in_progress', dueDate: '2026-08-01', createdAt: '2026-04-05T08:00:00Z' },
  { id: 'g3', projectId: 'p2', title: 'Reduce MTTR by 40%', description: 'Unified observability enables faster incident detection and resolution', successMetric: 'Mean Time To Resolution drops from 45min to 27min', status: 'not_started', dueDate: '2026-09-30', createdAt: '2026-05-05T08:00:00Z' },
];

const SEED_NOTES = [
  { id: 'n1', projectId: 'p1', title: 'IdP vendor decision', content: 'After evaluating Auth0, Okta, and Azure AD, we selected Okta based on:\n- Better compliance support for SOC2\n- Competitive pricing for our scale\n- Marcus confirmed Okta\'s API fits our SSO requirements\n\nAction items:\n- Sign contract by May 25\n- Schedule technical onboarding for June 1', source: 'typed', fileName: null, tags: ['decision', 'vendor'], createdAt: '2026-05-22T14:00:00Z' },
  { id: 'n2', projectId: 'p1', title: 'Staging environment blockers', content: 'Staging is down due to infrastructure reprovisioning. DevOps is working on it but ETA is unclear. This blocks:\n- Staging validation milestone\n- Integration testing\n\nRisks:\n- If staging isn\'t up by June 20, load testing will slip\n- Security team needs staging for pen testing', source: 'typed', fileName: null, tags: ['blocker', 'infra'], createdAt: '2026-06-17T10:00:00Z' },
  { id: 'n3', projectId: 'p1', title: 'Weekly sync notes — June 20', content: 'Attendees: Yair, Marcus, Dana, DevOps lead\n\n- Security review on track for June 25 delivery\n- Staging fix expected by end of week\n- Dana flagged: compliance documentation needs to start ASAP\n- Marcus: IdP sandbox has been set up for QA team', source: 'typed', fileName: null, tags: ['meeting'], createdAt: '2026-06-20T16:00:00Z' },
  { id: 'n4', projectId: 'p2', title: 'Tracing rollout retrospective', content: 'Tracing SDK rollout went smoothly. Key learnings:\n- Auto-instrumentation covered 80% of services\n- Manual instrumentation needed for legacy services\n- Performance overhead measured at <2ms per request\n\nNext: focus on logging pipeline standardization', source: 'typed', fileName: null, tags: ['retro'], createdAt: '2026-06-15T11:00:00Z' },
];

const SEED_STATUS_REPORTS = [
  {
    id: 'sr1', projectId: 'p1', period: 'Week of June 16', summary: 'Auth migration progressing with staging environment delays. Security review is on track but staging validation is blocked.', accomplishments: ['Security review vendor confirmed and scheduled', 'Dev environment fully operational', 'IdP sandbox configured for QA'], nextSteps: ['Resolve staging environment blocker', 'Begin security pen testing', 'Start compliance documentation'], risks: ['Staging reprovisioning delay may impact load testing timeline', 'Compliance documentation has not started'], ragStatus: 'amber', generatedAt: '2026-06-16T09:00:00Z', editedContent: null,
  },
  {
    id: 'sr2', projectId: 'p2', period: 'Week of June 16', summary: 'Observability project on track. Tracing SDK successfully integrated across all primary services.', accomplishments: ['Tracing SDK integrated and validated', 'Performance overhead measured at <2ms', 'Auto-instrumentation covers 80% of services'], nextSteps: ['Deploy logging pipeline to staging', 'Define standard log format across teams', 'Begin metrics dashboard design'], risks: ['None identified'], ragStatus: 'green', generatedAt: '2026-06-16T09:30:00Z', editedContent: null,
  },
];

const SEED_KPIS = [
  // Project-level KPIs (Auth Migration)
  { id: 'kpi1', level: 'project', projectId: 'p1', name: 'Milestone Completion', category: 'delivery', type: 'kpi', unit: '%', target: 100, direction: 'higher_is_better', thresholds: { green: 80, amber: 50 }, source: 'computed', computedFrom: 'milestone_completion_pct', formulaParams: {}, interval: 'weekly', currentValue: 50, lastCalculatedAt: '2026-06-20T08:00:00Z', history: [{ date: '2026-06-06', value: 33, note: null }, { date: '2026-06-13', value: 50, note: null }, { date: '2026-06-20', value: 50, note: null }], breachLog: [], createdAt: '2026-04-05T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi2', level: 'project', projectId: 'p1', name: 'On-Time Delivery Rate', category: 'delivery', type: 'kpi', unit: '%', target: 90, direction: 'higher_is_better', thresholds: { green: 85, amber: 70 }, source: 'computed', computedFrom: 'on_time_pct', formulaParams: { gracePeriodDays: 2 }, interval: 'weekly', currentValue: 100, lastCalculatedAt: '2026-06-20T08:00:00Z', history: [{ date: '2026-06-13', value: 100, note: null }, { date: '2026-06-20', value: 100, note: null }], breachLog: [], createdAt: '2026-04-05T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi3', level: 'project', projectId: 'p1', name: 'Blocked Items', category: 'delivery', type: 'kpi', unit: 'count', target: 0, direction: 'lower_is_better', thresholds: { green: 1, amber: 3 }, source: 'computed', computedFrom: 'blocked_count', formulaParams: {}, interval: 'weekly', currentValue: 1, lastCalculatedAt: '2026-06-20T08:00:00Z', history: [{ date: '2026-06-13', value: 0, note: null }, { date: '2026-06-20', value: 1, note: 'Staging blocker' }], breachLog: [], createdAt: '2026-04-05T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi4', level: 'project', projectId: 'p1', name: 'Incident Response SLA', category: 'process', type: 'sla', unit: 'hrs', target: 2, direction: 'lower_is_better', thresholds: { green: 2, amber: 4 }, source: 'manual', computedFrom: null, formulaParams: null, interval: 'weekly', currentValue: 1.8, lastCalculatedAt: null, history: [{ date: '2026-06-13', value: 2.1, note: 'Slow response on Fri P2' }, { date: '2026-06-20', value: 1.8, note: null }], breachLog: [{ id: 'b1', date: '2026-06-13', duration: '45m', note: 'P2 incident — on-call was in a meeting', resolved: true }], createdAt: '2026-04-05T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  // Program-level KPIs
  { id: 'kpi5', level: 'program', projectId: null, name: 'Overall Milestone Completion', category: 'delivery', type: 'kpi', unit: '%', target: 100, direction: 'higher_is_better', thresholds: { green: 70, amber: 40 }, source: 'computed', computedFrom: 'milestone_completion_pct', formulaParams: {}, interval: 'weekly', currentValue: 35.7, lastCalculatedAt: '2026-06-20T08:00:00Z', history: [{ date: '2026-06-13', value: 28.6, note: null }, { date: '2026-06-20', value: 35.7, note: null }], breachLog: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi6', level: 'program', projectId: null, name: 'Projects On Track', category: 'delivery', type: 'kpi', unit: 'count', target: 4, direction: 'higher_is_better', thresholds: { green: 3, amber: 2 }, source: 'manual', computedFrom: null, formulaParams: null, interval: 'weekly', currentValue: 2, lastCalculatedAt: null, history: [{ date: '2026-06-13', value: 3, note: null }, { date: '2026-06-20', value: 2, note: 'Auth migration moved to at_risk' }], breachLog: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi7', level: 'program', projectId: null, name: 'API Uptime', category: 'engineering', type: 'sla', unit: '%', target: 99.9, direction: 'higher_is_better', thresholds: { green: 99.5, amber: 99.0 }, source: 'manual', computedFrom: null, formulaParams: null, interval: 'weekly', currentValue: 99.7, lastCalculatedAt: null, history: [{ date: '2026-06-13', value: 99.6, note: 'Brief outage Monday morning' }, { date: '2026-06-20', value: 99.7, note: null }], breachLog: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
  { id: 'kpi8', level: 'program', projectId: null, name: 'Cross-Team Dependencies Resolved', category: 'process', type: 'kpi', unit: '%', target: 90, direction: 'higher_is_better', thresholds: { green: 80, amber: 60 }, source: 'manual', computedFrom: null, formulaParams: null, interval: 'monthly', currentValue: 72, lastCalculatedAt: null, history: [{ date: '2026-05-31', value: 65, note: null }, { date: '2026-06-20', value: 72, note: null }], breachLog: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-06-20T08:00:00Z' },
];

const SEED_RACI_P1 = {
  id: 'raci1',
  projectId: 'p1',
  generatedAt: '2026-06-10T10:00:00Z',
  sourceSnapshot: { stakeholderCount: 5, milestoneCount: 6, noteCount: 3 },
  columns: [
    { id: 'c1', name: 'Yair B.', role: 'TPM', sortOrder: 0 },
    { id: 'c2', name: 'Marcus T.', role: 'Eng Lead', sortOrder: 1 },
    { id: 'c3', name: 'Dana L.', role: 'Compliance Lead', sortOrder: 2 },
    { id: 'c4', name: 'DevOps', role: 'Infrastructure', sortOrder: 3 },
    { id: 'c5', name: 'Security', role: 'Security Team', sortOrder: 4 },
  ],
  rows: [
    { id: 'r1', area: 'Identity Provider Selection & Onboarding', sourceItems: ['IdP selected & contracted', 'IdP vendor decision'], cells: { c1: 'A', c2: 'R', c3: 'C', c4: '', c5: 'I' }, sortOrder: 0, isCustom: false },
    { id: 'r2', area: 'OAuth 2.0 Specification', sourceItems: ['OAuth 2.0 spec finalized'], cells: { c1: 'A', c2: 'R', c3: 'I', c4: 'C', c5: 'C' }, sortOrder: 1, isCustom: false },
    { id: 'r3', area: 'Infrastructure & Environments', sourceItems: ['Dev environment deployed', 'Staging validation'], cells: { c1: 'I', c2: 'C', c3: '', c4: 'R', c5: '' }, sortOrder: 2, isCustom: false },
    { id: 'r4', area: 'Security & Compliance', sourceItems: ['Security review & pen testing'], cells: { c1: 'A', c2: 'C', c3: 'R', c4: '', c5: 'R' }, sortOrder: 3, isCustom: false },
    { id: 'r5', area: 'Performance & Load Testing', sourceItems: ['Load testing complete'], cells: { c1: 'A', c2: 'C', c3: '', c4: 'R', c5: 'I' }, sortOrder: 4, isCustom: false },
    { id: 'r6', area: 'SSO Integration', sourceItems: ['SSO coverage for all internal tools'], cells: { c1: 'A', c2: 'R', c3: 'I', c4: 'C', c5: '' }, sortOrder: 5, isCustom: false },
    { id: 'r7', area: 'Migration Execution & Rollout', sourceItems: ['Zero-downtime migration for all users'], cells: { c1: 'A', c2: 'R', c3: 'C', c4: 'R', c5: 'I' }, sortOrder: 6, isCustom: false },
    { id: 'r8', area: 'Stakeholder Communication', sourceItems: ['Weekly sync notes'], cells: { c1: 'R', c2: 'I', c3: 'I', c4: 'I', c5: 'I' }, sortOrder: 7, isCustom: false },
  ],
  isActive: true,
};

// --- Debounce helper ---

let saveTimeout = null;
let pendingSave = null;
function debouncedSave(saveFn) {
  pendingSave = saveFn;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    pendingSave = null;
    saveFn();
  }, 500);
}

// Flush a still-debounced save when the tab closes so edits made in the
// last 500ms (e.g. typing an API key and closing) aren't lost. writeData
// mirrors to localStorage synchronously, so this lands during unload.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      const fn = pendingSave;
      pendingSave = null;
      fn?.();
    }
  });
}

// --- Store definition ---

const useStore = create((set, get) => {
  const store = {
    // --- State ---
    projects: [],
    milestones: [],
    goals: [],
    notes: [],
    statusReports: [],
    discoveryState: {},
    raciData: {},
    kpis: [],
    dataImports: [],
    documents: [],
    projectBriefs: {},
    program: {
      name: 'Platform Modernization',
      description: '',
      owner: 'Yair B.',
      startDate: '2026-04-01',
      targetDate: '2027-01-31',
      kpiIds: [],
    },
    settings: {
      apiKey: '',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5',
      aiBaseUrl: 'http://localhost:1234/v1',
    },
    fileHandle: null,
    isLoaded: false,
    lastSavedAt: null,
    folderConnected: false,
    aiApiKey: '',
    aiProvider: 'anthropic',
    aiModel: 'claude-haiku-4-5',
    aiBaseUrl: 'http://localhost:1234/v1',
    discoveryTemplate: DISCOVERY_TEMPLATE,
    searchQuery: '',
    askAiOpen: false,
    askAiContext: null,
    askAiMessages: [],

    // --- Persistence actions ---

    initFromFile: async () => {
      try {
        const { status, data } = await openFolder();
        if (status === 'cancelled') {
          // User dismissed the picker — leave current state untouched
          return;
        }
        if (data) {
          _loadData(set, get, data);
          set({ isLoaded: true, folderConnected: true, lastSavedAt: new Date().toISOString() });
        } else if (status === 'ok') {
          // Folder connected but has no tpm-data.json yet — keep the
          // current in-memory data and write it into the new folder
          set({ isLoaded: true, folderConnected: true });
          await get().saveData();
        } else if (!get().isLoaded) {
          _loadSeedData(set);
          set({ isLoaded: true });
        }
      } catch (e) {
        console.error('initFromFile failed:', e);
        if (!get().isLoaded) {
          _loadSeedData(set);
          set({ isLoaded: true });
        }
      }
    },

    initFromLocalStorage: () => {
      try {
        const raw = localStorage.getItem('tpm-portal-data');
        if (raw) {
          const data = JSON.parse(raw);
          _loadData(set, get, data);
        } else {
          _loadSeedData(set);
        }
        set({ isLoaded: true });
      } catch (e) {
        console.error('initFromLocalStorage failed:', e);
        _loadSeedData(set);
        set({ isLoaded: true });
      }
    },

    saveData: async () => {
      const s = get();
      // Never persist before initial data has loaded — a save fired from a
      // pre-init state would overwrite good stored data with an empty store
      if (!s.isLoaded) return;
      const data = _extractData(s);
      try {
        await writeData(data);
        set({ lastSavedAt: new Date().toISOString() });
      } catch (e) {
        console.error('Save failed:', e);
      }
    },

    // --- Project CRUD ---

    addProject: (p) => {
      const project = {
        id: uuidv4(),
        name: '',
        description: '',
        status: 'on_track',
        phase: 'Planning',
        startDate: '',
        targetDate: '',
        owner: '',
        stakeholders: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...p,
      };
      set(s => ({ projects: [...s.projects, project] }));
      _autosave(get);
      return project;
    },

    updateProject: (id, updates) => {
      set(s => ({
        projects: s.projects.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
      _autosave(get);
    },

    deleteProject: (id) => {
      set(s => {
        const { [id]: _r, ...restRaci } = s.raciData || {};
        const { [id]: _d, ...restDiscovery } = s.discoveryState || {};
        return {
          projects: s.projects.filter(p => p.id !== id),
          milestones: s.milestones.filter(m => m.projectId !== id),
          goals: s.goals.filter(g => g.projectId !== id),
          notes: s.notes.filter(n => n.projectId !== id),
          statusReports: s.statusReports.filter(r => r.projectId !== id),
          kpis: s.kpis.filter(k => k.projectId !== id),
          raciData: restRaci,
          discoveryState: restDiscovery,
        };
      });
      _autosave(get);
    },

    // --- Milestone CRUD ---

    addMilestone: (m) => {
      const milestone = {
        id: uuidv4(),
        projectId: '',
        name: '',
        dueDate: null,
        completedDate: null,
        status: 'upcoming',
        notes: '',
        assignees: [],
        predecessorNames: [],
        predecessorIds: [],
        isBlocked: false,
        notInLatestImport: false,
        lastImportedAt: null,
        archivedAt: null,
        ...m,
      };
      set(s => ({ milestones: [...s.milestones, milestone] }));
      _autosave(get);
      return milestone;
    },

    updateMilestone: (id, updates) => {
      set(s => ({
        milestones: s.milestones.map(m => (m.id === id ? { ...m, ...updates } : m)),
      }));
      _autosave(get);
    },

    deleteMilestone: (id) => {
      set(s => ({ milestones: s.milestones.filter(m => m.id !== id) }));
      _autosave(get);
    },

    archiveMilestone: (id) => {
      set(s => ({
        milestones: s.milestones.map(m =>
          m.id === id ? { ...m, archivedAt: new Date().toISOString() } : m
        ),
      }));
      _autosave(get);
    },

    restoreMilestone: (id) => {
      set(s => ({
        milestones: s.milestones.map(m =>
          m.id === id ? { ...m, archivedAt: null } : m
        ),
      }));
      _autosave(get);
    },

    importMilestones: (projectId, incoming) => {
      // Merge-not-replace: update existing by name, add new, keep missing
      set(s => {
        const existing = s.milestones.filter(m => m.projectId === projectId);
        const others = s.milestones.filter(m => m.projectId !== projectId);
        const now = new Date().toISOString();

        const existingByName = {};
        existing.forEach(m => {
          if (!m.archivedAt) {
            existingByName[m.name.toLowerCase()] = m;
          }
        });

        const incomingNames = new Set(incoming.map(m => m.name.toLowerCase()));
        const updatedIds = new Set();
        const result = [];

        // Process incoming: update or add
        incoming.forEach(inc => {
          const match = existingByName[inc.name.toLowerCase()];
          if (match) {
            updatedIds.add(match.id);
            result.push({
              ...match,
              dueDate: inc.dueDate ?? match.dueDate,
              completedDate: inc.completedDate ?? match.completedDate,
              status: inc.status || match.status,
              notes: inc.notes || match.notes,
              assignees: inc.assignees?.length > 0 ? inc.assignees : match.assignees,
              predecessorNames: inc.predecessorNames?.length > 0 ? inc.predecessorNames : match.predecessorNames,
              predecessorIds: inc.predecessorIds?.length > 0 ? inc.predecessorIds : match.predecessorIds,
              isBlocked: inc.isBlocked ?? match.isBlocked,
              notInLatestImport: false,
              lastImportedAt: now,
            });
          } else {
            result.push({
              id: uuidv4(),
              projectId,
              name: inc.name,
              dueDate: inc.dueDate || null,
              completedDate: inc.completedDate || null,
              status: inc.status || 'upcoming',
              notes: inc.notes || '',
              assignees: inc.assignees || [],
              predecessorNames: inc.predecessorNames || [],
              predecessorIds: inc.predecessorIds || [],
              isBlocked: inc.isBlocked || false,
              notInLatestImport: false,
              lastImportedAt: now,
              archivedAt: null,
            });
          }
        });

        // Process existing: flag not-in-file, keep archived
        existing.forEach(m => {
          if (updatedIds.has(m.id)) return; // Already processed
          if (m.archivedAt) {
            result.push(m); // Keep archived as-is
          } else if (!incomingNames.has(m.name.toLowerCase())) {
            result.push({ ...m, notInLatestImport: true });
          } else {
            result.push(m);
          }
        });

        return { milestones: [...others, ...result] };
      });
      _autosave(get);
    },

    // --- Goal CRUD ---

    addGoal: (g) => {
      const goal = {
        id: uuidv4(),
        projectId: '',
        title: '',
        description: '',
        successMetric: '',
        status: 'not_started',
        dueDate: null,
        createdAt: new Date().toISOString(),
        ...g,
      };
      set(s => ({ goals: [...s.goals, goal] }));
      _autosave(get);
      return goal;
    },

    updateGoal: (id, updates) => {
      set(s => ({
        goals: s.goals.map(g => (g.id === id ? { ...g, ...updates } : g)),
      }));
      _autosave(get);
    },

    deleteGoal: (id) => {
      set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
      _autosave(get);
    },

    // --- Note CRUD ---

    addNote: (n) => {
      const note = {
        id: uuidv4(),
        projectId: '',
        title: '',
        content: '',
        source: 'typed',
        fileName: null,
        tags: [],
        createdAt: new Date().toISOString(),
        ...n,
      };
      set(s => ({ notes: [...s.notes, note] }));
      _autosave(get);
      return note;
    },

    updateNote: (id, updates) => {
      set(s => ({
        notes: s.notes.map(n => (n.id === id ? { ...n, ...updates } : n)),
      }));
      _autosave(get);
    },

    deleteNote: (id) => {
      set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
      _autosave(get);
    },

    // --- Status Reports ---

    addStatusReport: (r) => {
      const report = {
        id: uuidv4(),
        generatedAt: new Date().toISOString(),
        editedContent: null,
        ...r,
      };
      set(s => ({ statusReports: [...s.statusReports, report] }));
      _autosave(get);
      return report;
    },

    updateStatusReport: (id, updates) => {
      set(s => ({
        statusReports: s.statusReports.map(r => (r.id === id ? { ...r, ...updates } : r)),
      }));
      _autosave(get);
    },

    // --- Discovery ---

    getDiscovery: (projectId) => {
      const s = get();
      if (s.discoveryState[projectId]) return s.discoveryState[projectId];
      return null;
    },

    initDiscovery: (projectId) => {
      const s = get();
      if (s.discoveryState[projectId]) return;
      const template = DISCOVERY_TEMPLATE.map(cat => ({
        name: cat.name,
        collapsed: false,
        items: cat.items.map(item => ({ ...item })),
      }));
      set(st => ({ discoveryState: { ...st.discoveryState, [projectId]: template } }));
    },

    toggleDiscoveryCheck: (projectId, catIdx, itemIdx) => {
      set(s => {
        const disc = JSON.parse(JSON.stringify(s.discoveryState[projectId] || []));
        if (disc[catIdx]?.items?.[itemIdx]) {
          disc[catIdx].items[itemIdx].checked = !disc[catIdx].items[itemIdx].checked;
        }
        return { discoveryState: { ...s.discoveryState, [projectId]: disc } };
      });
      _autosave(get);
    },

    setDiscoveryNote: (projectId, catIdx, itemIdx, note) => {
      set(s => {
        const disc = JSON.parse(JSON.stringify(s.discoveryState[projectId] || []));
        if (disc[catIdx]?.items?.[itemIdx]) {
          disc[catIdx].items[itemIdx].note = note;
        }
        return { discoveryState: { ...s.discoveryState, [projectId]: disc } };
      });
      _autosave(get);
    },

    addCustomDiscoveryItem: (projectId, catIdx, text) => {
      set(s => {
        const disc = JSON.parse(JSON.stringify(s.discoveryState[projectId] || []));
        if (disc[catIdx]) {
          disc[catIdx].items.push({ text, checked: false, note: '', isCustom: true });
        }
        return { discoveryState: { ...s.discoveryState, [projectId]: disc } };
      });
      _autosave(get);
    },

    toggleDiscoveryCategory: (projectId, catIdx) => {
      set(s => {
        const disc = JSON.parse(JSON.stringify(s.discoveryState[projectId] || []));
        if (disc[catIdx]) {
          disc[catIdx].collapsed = !disc[catIdx].collapsed;
        }
        return { discoveryState: { ...s.discoveryState, [projectId]: disc } };
      });
      // No save needed — UI-only state
    },

    // --- RACI ---

    setRaci: (projectId, data) => {
      set(s => ({ raciData: { ...s.raciData, [projectId]: data } }));
      _autosave(get);
    },

    setRaciData: (projectId, data) => {
      set(s => ({ raciData: { ...s.raciData, [projectId]: data } }));
      _autosave(get);
    },

    cycleRaciCell: (projectId, rowIdx, colId) => {
      const cycle = ['', 'R', 'A', 'C', 'I'];
      set(s => {
        const raci = JSON.parse(JSON.stringify(s.raciData[projectId] || { columns: [], rows: [] }));
        if (raci.rows[rowIdx]?.cells) {
          const current = raci.rows[rowIdx].cells[colId] || '';
          const nextIdx = (cycle.indexOf(current) + 1) % cycle.length;
          raci.rows[rowIdx].cells[colId] = cycle[nextIdx];
        }
        return { raciData: { ...s.raciData, [projectId]: raci } };
      });
      _autosave(get);
    },

    // --- KPIs ---

    addKpi: (k) => {
      const kpi = {
        id: uuidv4(),
        level: 'project',
        projectId: null,
        name: '',
        category: 'delivery',
        type: 'kpi',
        unit: '%',
        target: 0,
        direction: 'higher_is_better',
        thresholds: { green: 0, amber: 0 },
        source: 'manual',
        computedFrom: null,
        formulaParams: null,
        interval: 'weekly',
        currentValue: null,
        lastCalculatedAt: null,
        history: [],
        breachLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...k,
      };
      set(s => ({ kpis: [...s.kpis, kpi] }));
      _autosave(get);
      return kpi;
    },

    updateKpi: (id, updates) => {
      set(s => ({
        kpis: s.kpis.map(k => (k.id === id ? { ...k, ...updates, updatedAt: new Date().toISOString() } : k)),
      }));
      _autosave(get);
    },

    deleteKpi: (id) => {
      set(s => ({ kpis: s.kpis.filter(k => k.id !== id) }));
      _autosave(get);
    },

    addKpiHistoryEntry: (kpiId, entry) => {
      set(s => ({
        kpis: s.kpis.map(k => {
          if (k.id !== kpiId) return k;
          const newHistory = [...(k.history || []), entry];
          return {
            ...k,
            history: newHistory,
            currentValue: entry.value,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      _autosave(get);
    },

    addKpiBreach: (kpiId, breach) => {
      const newBreach = {
        id: uuidv4(),
        resolved: false,
        ...breach,
      };
      set(s => ({
        kpis: s.kpis.map(k => {
          if (k.id !== kpiId) return k;
          return {
            ...k,
            breachLog: [...(k.breachLog || []), newBreach],
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      _autosave(get);
    },

    recordKpiValue: (kpiId, value, date) => {
      const entry = { date: date || new Date().toISOString().split('T')[0], value, note: null };
      set(s => ({
        kpis: s.kpis.map(k => {
          if (k.id !== kpiId) return k;
          return { ...k, history: [...(k.history || []), entry], currentValue: value, updatedAt: new Date().toISOString() };
        }),
      }));
      _autosave(get);
    },

    // --- Data Imports ---

    addDataImport: (imp) => {
      const record = { id: uuidv4(), importedAt: new Date().toISOString(), ...imp };
      set(s => ({ dataImports: [...s.dataImports, record] }));
      _autosave(get);
    },

    // --- Project folder documents ---

    setProjectDocuments: (projectId, docs) => {
      set(s => ({
        documents: [...s.documents.filter(d => d.projectId !== projectId), ...docs],
      }));
      _autosave(get);
    },

    updateDocument: (id, updates) => {
      set(s => ({
        documents: s.documents.map(d => (d.id === id ? { ...d, ...updates } : d)),
      }));
      _autosave(get);
    },

    setProjectBrief: (projectId, brief) => {
      set(s => ({ projectBriefs: { ...s.projectBriefs, [projectId]: brief } }));
      _autosave(get);
    },

    // --- Settings ---

    setAiApiKey: (key) => {
      set(s => ({ aiApiKey: key, settings: { ...s.settings, apiKey: key } }));
      _autosave(get);
    },

    setAiProvider: (provider, defaultModel) => {
      set(s => ({
        aiProvider: provider,
        aiModel: defaultModel,
        settings: { ...s.settings, aiProvider: provider, aiModel: defaultModel },
      }));
      _autosave(get);
    },

    setAiModel: (model) => {
      set(s => ({ aiModel: model, settings: { ...s.settings, aiModel: model } }));
      _autosave(get);
    },

    setAiBaseUrl: (url) => {
      set(s => ({ aiBaseUrl: url, settings: { ...s.settings, aiBaseUrl: url } }));
      _autosave(get);
    },

    updateSettings: (updates) => {
      set(s => ({ settings: { ...s.settings, ...updates } }));
      _autosave(get);
    },

    // --- Search ---

    setSearchQuery: (q) => set({ searchQuery: q }),

    // --- Ask AI ---

    setAskAiOpen: (open, context) => {
      set({ askAiOpen: open, ...(context !== undefined ? { askAiContext: context } : {}) });
    },

    addAskAiMessage: (msg) => {
      set(s => ({ askAiMessages: [...s.askAiMessages, msg] }));
    },

    clearAskAiMessages: () => {
      set({ askAiMessages: [] });
    },

    // --- Discovery Template (settings) ---

    setDiscoveryTemplate: () => {},

    resetDiscoveryTemplate: () => {},

    // --- Program ---

    updateProgram: (updates) => {
      set(s => ({ program: { ...s.program, ...updates } }));
      _autosave(get);
    },
  };

  return store;
});

// --- Internal helpers ---

function _autosave(get) {
  debouncedSave(() => get().saveData());
}

const MAX_KPI_HISTORY = 104;
const MAX_DATA_IMPORTS = 50;
const MAX_DOCUMENTS = 500;

function _extractData(state) {
  return {
    projects: state.projects,
    milestones: state.milestones,
    goals: state.goals,
    notes: state.notes,
    statusReports: state.statusReports,
    discoveryState: state.discoveryState,
    raciData: state.raciData,
    kpis: state.kpis.map(k =>
      k.history && k.history.length > MAX_KPI_HISTORY
        ? { ...k, history: k.history.slice(-MAX_KPI_HISTORY) }
        : k
    ),
    dataImports: state.dataImports.slice(-MAX_DATA_IMPORTS),
    documents: state.documents.slice(-MAX_DOCUMENTS),
    projectBriefs: state.projectBriefs,
    program: state.program,
    settings: state.settings,
  };
}

function _loadData(set, get, data) {
  const apiKey = data.settings?.apiKey || data.aiApiKey || '';
  const aiProvider = data.settings?.aiProvider || data.aiProvider || 'anthropic';
  const aiModel = data.settings?.aiModel || data.aiModel || 'claude-haiku-4-5';
  const aiBaseUrl = data.settings?.aiBaseUrl || data.aiBaseUrl || 'http://localhost:1234/v1';
  set({
    projects: data.projects || [],
    milestones: data.milestones || [],
    goals: data.goals || [],
    notes: data.notes || [],
    statusReports: data.statusReports || [],
    discoveryState: data.discoveryState || data.discovery || {},
    raciData: data.raciData || data.raci || {},
    kpis: data.kpis || [],
    dataImports: data.dataImports || [],
    documents: data.documents || [],
    projectBriefs: data.projectBriefs || {},
    program: data.program || get().program,
    settings: { ...get().settings, ...(data.settings || {}), apiKey, aiProvider, aiModel, aiBaseUrl },
    aiApiKey: apiKey,
    aiProvider: aiProvider,
    aiModel: aiModel,
    aiBaseUrl: aiBaseUrl,
  });
}

function _loadSeedData(set) {
  set({
    projects: SEED_PROJECTS,
    milestones: SEED_MILESTONES,
    goals: SEED_GOALS,
    notes: SEED_NOTES,
    statusReports: SEED_STATUS_REPORTS,
    discoveryState: {},
    raciData: { p1: SEED_RACI_P1 },
    kpis: SEED_KPIS,
    dataImports: [],
    program: {
      name: 'Platform Modernization',
      description: 'Cross-cutting engineering program encompassing auth, observability, customer experience, and data infrastructure modernization.',
      owner: 'Yair B.',
      startDate: '2026-04-01',
      targetDate: '2027-01-31',
      kpiIds: ['kpi5', 'kpi6', 'kpi7', 'kpi8'],
    },
    settings: {
      apiKey: '',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5',
      aiBaseUrl: 'http://localhost:1234/v1',
    },
  });
}

export default useStore;
