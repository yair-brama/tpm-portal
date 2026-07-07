// --- Provider registry ---

export const DEFAULT_LMSTUDIO_URL = 'http://localhost:1234/v1';

export const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    group: 'external',
    keyPlaceholder: 'sk-ant-...',
    models: [
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Best)' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    group: 'external',
    keyPlaceholder: 'sk-...',
    models: [
      { value: 'gpt-5-mini', label: 'GPT-5 mini (Fast)' },
      { value: 'gpt-5', label: 'GPT-5 (Balanced)' },
      { value: 'gpt-5.1', label: 'GPT-5.1 (Best)' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google (Gemini)',
    group: 'external',
    keyPlaceholder: 'AIza...',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best)' },
    ],
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (Local LLM)',
    group: 'local',
    requiresKey: false,
    keyPlaceholder: 'not required',
    models: [],
  },
];

export const DEFAULT_PROVIDER = 'anthropic';

export function defaultModelFor(providerId) {
  const provider = PROVIDERS.find(p => p.id === providerId) || PROVIDERS[0];
  return provider.models[0]?.value || '';
}

/**
 * Whether AI features can be used with the current provider + key.
 * Local providers (LM Studio) don't need an API key.
 */
export function isAiReady(providerId, apiKey) {
  const provider = PROVIDERS.find(p => p.id === providerId);
  if (provider && provider.requiresKey === false) return true;
  return !!apiKey;
}

async function readErrorBody(res) {
  return res.text().catch(() => '');
}

/**
 * Anthropic Messages API.
 */
async function callAnthropic({ apiKey, model }, systemPrompt, messages, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await readErrorBody(res)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

/**
 * OpenAI Chat Completions API.
 */
async function callOpenAi({ apiKey, model }, systemPrompt, messages, maxTokens) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // GPT-5 models spend part of the budget on internal reasoning tokens,
      // so give extra headroom beyond the visible-output budget.
      max_completion_tokens: maxTokens * 4,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await readErrorBody(res)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI API returned an empty response');
  return text;
}

/**
 * Google Gemini generateContent API.
 */
async function callGemini({ apiKey, model }, systemPrompt, messages, maxTokens) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        // Gemini 2.5 models spend part of the budget on internal thinking tokens.
        generationConfig: { maxOutputTokens: maxTokens * 4 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await readErrorBody(res)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');
  if (!text) throw new Error('Gemini API returned an empty response');
  return text;
}

/**
 * LM Studio local server (OpenAI-compatible API).
 */
async function callLmStudio({ model, baseUrl }, systemPrompt, messages, maxTokens) {
  const base = (baseUrl || DEFAULT_LMSTUDIO_URL).replace(/\/+$/, '');
  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // If no model is set, LM Studio falls back to the currently loaded one
        ...(model ? { model } : {}),
        max_tokens: maxTokens * 4,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });
  } catch {
    throw new Error(`Could not reach LM Studio at ${base}. Make sure the local server is running (Developer tab in LM Studio) and CORS is enabled in its settings.`);
  }
  if (!res.ok) {
    throw new Error(`LM Studio API error: ${res.status} ${await readErrorBody(res)}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('LM Studio returned an empty response');
  // Local reasoning models (DeepSeek R1, Qwen, etc.) may emit <think> blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!text) throw new Error('LM Studio returned only reasoning output with no answer; try a larger max_tokens or a non-reasoning model');
  return text;
}

/**
 * List the models available on an LM Studio server.
 *
 * @param {string} baseUrl
 * @returns {Promise<string[]>} Model ids
 */
export async function fetchLmStudioModels(baseUrl) {
  const base = (baseUrl || DEFAULT_LMSTUDIO_URL).replace(/\/+$/, '');
  let res;
  try {
    res = await fetch(`${base}/models`);
  } catch {
    throw new Error(`Could not reach LM Studio at ${base}. Make sure the local server is running (Developer tab in LM Studio) and CORS is enabled in its settings.`);
  }
  if (!res.ok) {
    throw new Error(`LM Studio API error: ${res.status} ${await readErrorBody(res)}`);
  }
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

/**
 * Provider-agnostic LLM call.
 *
 * @param {{provider: string, apiKey: string, model: string, baseUrl?: string}} aiConfig
 * @param {string} systemPrompt
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @param {number} maxTokens
 * @returns {Promise<string>} Response text
 */
async function callLLM(aiConfig, systemPrompt, messages, maxTokens = 2048) {
  const provider = aiConfig.provider || DEFAULT_PROVIDER;
  switch (provider) {
    case 'openai':
      return callOpenAi(aiConfig, systemPrompt, messages, maxTokens);
    case 'gemini':
      return callGemini(aiConfig, systemPrompt, messages, maxTokens);
    case 'lmstudio':
      return callLmStudio(aiConfig, systemPrompt, messages, maxTokens);
    case 'anthropic':
    default:
      return callAnthropic(aiConfig, systemPrompt, messages, maxTokens);
  }
}

// --- Context assembly helpers ---

function formatMilestoneContext(milestones) {
  if (!milestones || milestones.length === 0) return 'No milestones defined.';
  return milestones
    .filter(m => !m.archivedAt)
    .map(m => `- ${m.name} — due ${m.dueDate || 'TBD'} — ${m.status}${m.isBlocked ? ' [BLOCKED]' : ''}`)
    .join('\n');
}

function formatGoalContext(goals) {
  if (!goals || goals.length === 0) return 'No goals defined.';
  return goals
    .map(g => `- ${g.title} — ${g.status} — success metric: ${g.successMetric || 'not defined'}`)
    .join('\n');
}

function formatNoteContext(notes) {
  if (!notes || notes.length === 0) return 'No notes captured.';
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  return notes
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(n => {
      const created = new Date(n.createdAt);
      const dateLabel = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (created >= fourteenDaysAgo) {
        // Recent notes: full text
        return `[${dateLabel}] ${n.title}:\n${n.content}`;
      } else {
        // Older notes: summary only (use first 200 chars as proxy for summary)
        const summary = n.content?.substring(0, 200) || '';
        return `[${dateLabel}] ${n.title}: ${summary}${n.content?.length > 200 ? '...' : ''}`;
      }
    })
    .join('\n\n');
}

function daysAway(dateStr) {
  if (!dateStr) return 'no date set';
  const days = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  return `${days} days away`;
}

// --- Public API ---

/**
 * Generate a status report for a project.
 * Assembles context per spec 8.1 and returns a parsed report object.
 */
export async function generateStatusReport(aiConfig, project, milestones, goals, notes) {
  const context = `Project: ${project.name}
Phase: ${project.phase || 'Not specified'}
Target Date: ${project.targetDate || 'Not set'} (${daysAway(project.targetDate)})
RAG Status: ${project.status}

Milestones:
${formatMilestoneContext(milestones)}

Goals:
${formatGoalContext(goals)}

Notes (all, newest first):
${formatNoteContext(notes)}`;

  const systemPrompt = `You are a technical program manager writing a weekly status update.
Based on the project data below, write a status report with:
1. Executive Summary (2-3 sentences)
2. Accomplishments this week (bullet list)
3. Next steps (bullet list)
4. Risks & Blockers (bullet list, or "None identified" if clean)

Be concise, factual, and professional. Use the project data — do not invent information.

After the report, on a new line, output a JSON line with the RAG assessment:
{"ragStatus": "green|amber|red"}`;

  const response = await callLLM(aiConfig, systemPrompt, [{ role: 'user', content: context }], 2048);

  // Parse the response into structured fields
  return parseStatusReport(response, project);
}

function parseStatusReport(text, project) {
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    projectId: project.id,
    period: `Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    summary: '',
    accomplishments: [],
    nextSteps: [],
    risks: [],
    ragStatus: 'green',
    generatedAt: new Date().toISOString(),
    editedContent: null,
  };

  // Try to extract JSON RAG status from end of response
  const jsonMatch = text.match(/\{"ragStatus"\s*:\s*"(green|amber|red)"\}/);
  if (jsonMatch) {
    report.ragStatus = jsonMatch[1];
  }

  // Remove JSON line from displayed text
  const cleanText = text.replace(/\{"ragStatus"\s*:\s*"(?:green|amber|red)"\}\s*$/, '').trim();

  // Parse sections
  const sections = cleanText.split(/###?\s+/);

  sections.forEach(section => {
    const lines = section.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    const header = lines[0].toLowerCase().replace(/[:#]/g, '').trim();
    const bulletItems = lines.slice(1)
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.trim().replace(/^[-*]\s*/, ''));

    if (header.includes('executive summary') || header.includes('summary')) {
      report.summary = lines.slice(1).filter(l => !l.trim().startsWith('-')).join(' ').trim();
      if (!report.summary && bulletItems.length > 0) {
        report.summary = bulletItems.join(' ');
      }
    } else if (header.includes('accomplishment') || header.includes('completed')) {
      report.accomplishments = bulletItems;
    } else if (header.includes('next step') || header.includes('upcoming')) {
      report.nextSteps = bulletItems;
    } else if (header.includes('risk') || header.includes('blocker')) {
      report.risks = bulletItems;
    }
  });

  // If summary is still empty, use the first non-header paragraph
  if (!report.summary) {
    const firstPara = cleanText.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('-'));
    report.summary = firstPara?.trim() || cleanText.substring(0, 300);
  }

  return report;
}

/**
 * Generate a RACI matrix for a project.
 * Per spec 9.3.
 */
export async function generateRaciMatrix(aiConfig, project, stakeholders, milestones, goals, notes, discovery) {
  const stakeholderList = (stakeholders || []).map(s =>
    typeof s === 'string' ? s : `${s.name} (${s.role || 'role unknown'})`
  ).join(', ');

  // Extract action items from notes (simple heuristic: lines starting with - or *)
  const actionItems = (notes || [])
    .flatMap(n => (n.content || '').split('\n'))
    .filter(l => l.trim().match(/^[-*]\s/))
    .map(l => l.trim().replace(/^[-*]\s*/, ''))
    .slice(0, 20); // Limit to avoid token bloat

  // Discovery items with notes
  const discoveryItems = (discovery || [])
    .flatMap(cat => (cat.items || [])
      .filter(item => item.checked && item.note)
      .map(item => `${item.text}: ${item.note}`)
    )
    .slice(0, 15);

  const projectData = `Stakeholders: ${stakeholderList || 'None listed'}

Milestones:
${(milestones || []).filter(m => !m.archivedAt).map(m => `- ${m.name} (${m.status})`).join('\n') || 'None'}

Goals:
${(goals || []).map(g => `- ${g.title}`).join('\n') || 'None'}

Action items from notes:
${actionItems.length > 0 ? actionItems.map(a => `- ${a}`).join('\n') : 'None extracted'}

Discovery checklist items (checked, with notes):
${discoveryItems.length > 0 ? discoveryItems.map(d => `- ${d}`).join('\n') : 'None'}`;

  const systemPrompt = `You are a technical program manager building a RACI matrix.

Given the project data below, produce a RACI matrix with:
- 8-12 rows representing distinct responsibility areas (group related tasks thematically)
- One column per unique person or role identified in the data
- Assignments: R (Responsible), A (Accountable), C (Consulted), I (Informed), or blank
- Every row must have exactly one A
- A person can hold R and A simultaneously on the same row
- Prefer fewer, clearer assignments over comprehensive but noisy ones

Return JSON in this exact format (no markdown fences, just raw JSON):
{
  "columns": [{"id": "c1", "name": "Full Name", "role": "Role Title"}, ...],
  "rows": [
    {
      "id": "r1",
      "area": "Area label",
      "sourceItems": ["milestone or action item name", ...],
      "cells": {"c1": "R", "c2": "A", ...}
    }, ...
  ]
}`;

  const response = await callLLM(aiConfig, systemPrompt, [{ role: 'user', content: projectData }], 2048);

  // Parse JSON from response (may be wrapped in markdown code fences)
  const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const matrix = JSON.parse(jsonStr);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      projectId: project.id,
      generatedAt: new Date().toISOString(),
      sourceSnapshot: {
        stakeholderCount: (stakeholders || []).length,
        milestoneCount: (milestones || []).length,
        noteCount: (notes || []).length,
      },
      columns: matrix.columns || [],
      rows: (matrix.rows || []).map(r => ({ ...r, isCustom: false, sortOrder: 0 })),
      isActive: true,
    };
  } catch (e) {
    throw new Error(`Failed to parse RACI matrix from AI response: ${e.message}`);
  }
}

/**
 * Suggest KPIs for a project (or program).
 * Per spec 8.3.
 */
export async function suggestKpis(aiConfig, project, milestones, goals, notes, existingKpis) {
  const context = `Project name: ${project?.name || 'Program-wide'}
Description: ${project?.description || 'N/A'}
Current phase: ${project?.phase || 'N/A'}

Goals:
${(goals || []).map(g => `- ${g.title} — success metric: ${g.successMetric || 'not defined'}`).join('\n') || 'None'}

Milestones:
${(milestones || []).filter(m => !m.archivedAt).map(m => `- ${m.name} (${m.status}${m.isBlocked ? ', BLOCKED' : ''})`).join('\n') || 'None'}

Notes:
${formatNoteContext(notes)}

Existing KPIs (avoid duplicates):
${(existingKpis || []).map(k => `- ${k.name}`).join('\n') || 'None'}`;

  const systemPrompt = `You are a TPM advisor suggesting KPIs and SLAs for a project.

Based on the project data, suggest 5-7 KPIs or SLAs that are:
- Grounded in specific evidence from the project data (notes, milestones, goals)
- Each with a one-sentence rationale citing specific evidence
- Not duplicates of existing KPIs

Return JSON array (no markdown fences, raw JSON only):
[
  {
    "name": "KPI Name",
    "category": "engineering|business|delivery|process",
    "type": "kpi|sla",
    "suggestedTarget": 99.9,
    "unit": "%|ms|count|$|hrs",
    "direction": "higher_is_better|lower_is_better",
    "rationale": "One sentence citing specific project evidence."
  }
]`;

  const response = await callLLM(aiConfig, systemPrompt, [{ role: 'user', content: context }], 2048);

  const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse KPI suggestions from AI response: ${e.message}`);
  }
}

/**
 * Conversational AI advisor.
 * Takes conversation history and project/program context.
 *
 * @param {{provider: string, apiKey: string, model: string}} aiConfig
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {Object} context - Project or program context object
 * @returns {Promise<string>} AI response text
 */
export async function askAi(aiConfig, messages, context) {
  const contextSummary = context.isProgram
    ? buildProgramContext(context)
    : buildProjectContext(context);

  const systemPrompt = `You are a TPM (Technical Program Manager) advisor with full context on the user's ${context.isProgram ? 'program' : 'project'}. Your role is to:
- Ground assertions in specific evidence from the context provided
- Say explicitly when you lack sufficient data
- Ask one clarifying question at a time when needed
- Offer concrete recommendations rather than hedging indefinitely
- When discussing KPI values, suggest a specific number with rationale, not a range

Project/Program Context:
${contextSummary}

You are an advisor only — you do not write data to the portal. The TPM acts on your suggestions manually.`;

  return callLLM(aiConfig, systemPrompt, messages, 1024);
}

function buildProjectContext(ctx) {
  const parts = [
    `Project: ${ctx.project?.name || 'Unknown'}`,
    `Phase: ${ctx.project?.phase || 'N/A'}`,
    `Status: ${ctx.project?.status || 'N/A'}`,
    `Target Date: ${ctx.project?.targetDate || 'Not set'}`,
    `Owner: ${ctx.project?.owner || 'N/A'}`,
    '',
    'Milestones:',
    formatMilestoneContext(ctx.milestones),
    '',
    'Goals:',
    formatGoalContext(ctx.goals),
    '',
    'Notes:',
    formatNoteContext(ctx.notes),
  ];

  if (ctx.kpis && ctx.kpis.length > 0) {
    parts.push('', 'KPIs:');
    ctx.kpis.forEach(k => {
      parts.push(`- ${k.name}: ${k.currentValue ?? 'no value'} ${k.unit} (target: ${k.target}, RAG: ${k.rag || 'N/A'})`);
    });
  }

  return parts.join('\n');
}

function buildProgramContext(ctx) {
  const parts = [
    `Program: ${ctx.program?.name || 'Unknown'}`,
    `Owner: ${ctx.program?.owner || 'N/A'}`,
    `Target Date: ${ctx.program?.targetDate || 'Not set'}`,
    '',
    'Projects:',
  ];

  (ctx.projects || []).forEach(p => {
    const ms = (ctx.milestones || []).filter(m => m.projectId === p.id && !m.archivedAt);
    const completed = ms.filter(m => m.status === 'completed').length;
    parts.push(`- ${p.name} [${p.status}] — ${completed}/${ms.length} milestones, target: ${p.targetDate || 'N/A'}`);
  });

  if (ctx.alerts) {
    parts.push('', 'Morning Summary Alerts:');
    if (ctx.alerts.overdue?.length) parts.push(`- ${ctx.alerts.overdue.length} overdue milestones`);
    if (ctx.alerts.blocked?.length) parts.push(`- ${ctx.alerts.blocked.length} blocked milestones`);
    if (ctx.alerts.slaBreached?.length) parts.push(`- ${ctx.alerts.slaBreached.length} SLA breaches`);
    if (ctx.alerts.kpisAtRisk?.length) parts.push(`- ${ctx.alerts.kpisAtRisk.length} KPIs at risk`);
  }

  if (ctx.kpis && ctx.kpis.length > 0) {
    parts.push('', 'Program KPIs:');
    ctx.kpis.forEach(k => {
      parts.push(`- ${k.name}: ${k.currentValue ?? 'no value'} ${k.unit} (target: ${k.target})`);
    });
  }

  return parts.join('\n');
}
