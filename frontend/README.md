# @techtide/frontend

React operator UI for TechTideAI.

## Tech Stack

- React 18 + TypeScript
- Vite (dev server + build)
- Tailwind CSS v4
- React Router v6
- class-variance-authority (CVA) for component variants

## Source Layout

```
src/
├── components/
│   ├── ui/         Shadcn-lite primitives (Button, Card, Input, etc.)
│   ├── layout/     DashboardShell, Sidebar, Topbar
│   └── icons/      Icon library
├── contexts/       React context providers (Toast)
├── hooks/          Custom hooks (useAgents, useRuns, useToast)
├── lib/            API client, utilities
├── pages/          Route pages (Dashboard, Agents, Console, Runs)
└── test/           Test setup and utilities
```

## Theming

CSS variables define the color system. Key tokens:

- `--bg`, `--bg-card`, `--bg-hover` — Background layers
- `--ink`, `--ink-muted`, `--ink-faint` — Text hierarchy
- `--accent`, `--accent-glow` — Brand accent

## Path Alias

`@/` maps to `src/` via Vite config. Use `import { Button } from "@/components/ui"`.

## Commands

```bash
pnpm dev            # Start dev server on :5180 (Vite)
pnpm build          # Production build
pnpm lint           # ESLint
pnpm test           # Run Vitest + Testing Library suite
```

## Environment

Copy `frontend/.env.example` to `frontend/.env`.

Key variable: `VITE_API_BASE_URL` (defaults to `http://localhost:4050`).

## Testing

Tests use Vitest + React Testing Library with jsdom environment. Test files are co-located with components (`*.test.tsx`).
