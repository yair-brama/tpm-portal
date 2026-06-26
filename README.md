# The Governance Desk — TPM Portal

A personal web application for Technical Program Managers to track, manage, and communicate the status of multiple concurrent programs. Built with React + Vite.

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Chrome or Edge** browser (required for File System Access API — Firefox is not supported)
- **Anthropic API key** (optional, for AI features) — [Get one at console.anthropic.com](https://console.anthropic.com)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open http://localhost:5173 in Chrome or Edge
```

## Deploying to Another Computer

```bash
# 1. Copy the entire tpm-app folder to the new machine
#    (or clone from git if you've committed it)
  git clone https://github.com/yair-brama/tpm-portal.git
  cd tpm-portal
  npm install
  npm run dev

# 2. Install Node.js 18+ on the new machine
#    https://nodejs.org/

# 3. Open a terminal in the tpm-app folder and install dependencies
npm install

# 4. Option A: Run the dev server
npm run dev

# 4. Option B: Build for production and serve
npm run build
npx serve dist
```

## Production Build

```bash
# Build optimized bundle (output in dist/)
npm run build

# Preview the production build locally
npm run preview

# Or serve with any static file server
npx serve dist
```

The `dist/` folder is fully self-contained — copy it to any static hosting (Netlify, Vercel, GitHub Pages, or just a local folder served by any HTTP server).

## Data Storage

On first launch, the app prompts you to select a folder. All data is saved to `tpm-data.json` in that folder.

- **If the folder is inside OneDrive/Google Drive**, your data is automatically backed up and synced
- **To migrate data**, just copy `tpm-data.json` to the new machine and point the app at its folder
- **Fallback**: if the File System Access API isn't available (e.g., Firefox), data is stored in localStorage

## AI Features

AI-powered features (status report generation, RACI matrix, KPI suggestions, Ask AI advisor) require an Anthropic API key:

1. Go to **Settings** in the app
2. Enter your API key (starts with `sk-ant-`)
3. Select your preferred model (default: `claude-haiku-4-5`)

Without an API key, all non-AI features work normally.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Vite) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router v6 |
| CSV Parsing | PapaParse |
| Charts | Recharts |
| AI | Anthropic Claude API (direct browser calls) |
| Persistence | File System Access API → `tpm-data.json` |

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Router + layout shell
├── index.css             # Tailwind + custom styles
├── store/
│   ├── useStore.js       # Zustand store (all state + actions)
│   └── persistence.js    # File System Access API read/write
├── lib/
│   ├── helpers.js        # Shared utility functions
│   ├── import.js         # CSV/JSON import logic + profiles
│   ├── health.js         # RAG auto-calculation
│   ├── alerts.js         # Morning summary alert computation
│   ├── kpiCompute.js     # Computed KPI formula engine
│   └── ai.js             # Anthropic API calls
└── components/
    ├── layout/           # Sidebar, Header, Icon
    ├── dashboard/        # Dashboard, ProjectCard, SummaryBar, MorningSummary
    ├── project/          # All project detail tabs
    ├── program/          # Program rollup view
    ├── settings/         # Settings page
    └── shared/           # Modal, Sparkline, AskAiPanel
```
