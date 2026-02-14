# CLAUDE.md - Instructions for Claude Code

## Project: Meridian (S&OP Data Program Tracker)

Read `MASTERPLAN.md` first. It is the single source of truth for scope, architecture, and design decisions.

## Knowledge Base

Before building any feature, read the relevant context file:

| Building... | Read first |
|------------|-----------|
| Database schema / migrations | `docs/data-model/CONTEXT.md` |
| System architecture, component tree | `docs/architecture/CONTEXT.md` |
| Object lifecycle tracker | `docs/features/01-object-lifecycle.md` |
| Issue register | `docs/features/02-issue-register.md` |
| Filtering and views | `docs/features/03-views-and-filters.md` |
| Aging logic | `docs/features/04-aging.md` |
| Archiving | `docs/features/05-archiving.md` |
| Excel export | `docs/features/06-excel-export.md` |
| Reports page | `docs/features/07-reports.md` |
| Dashboard / analytics | `docs/features/08-dashboard.md` |
| Bulk actions | `docs/features/09-bulk-actions.md` |
| Meetings & AI summarization | `docs/features/09-meetings.md` |
| Comments thread | `docs/features/10-comments.md` |
| Recurring schedule | `docs/features/10-schedule.md` |
| External API (Issues) | `docs/features/11-api.md` |
| Theme, pins, CSV import, search | `docs/features/12-extras.md` |
| UI/UX, colors, typography, components | `docs/design/CONTEXT.md` |
| Deployment (Vercel + Supabase) | `docs/deployment/CONTEXT.md` |
| Data masking rules | `docs/masking/CONTEXT.md` |

## Tech Stack

- **React** (Vite, TypeScript)
- **Tailwind CSS** for styling
- **Supabase** (Postgres + Auth + auto-generated REST API)
- **TanStack React Query** for server state management
- **React Router** for navigation
- **Vercel** for hosting

## Running the App

```bash
npm install
npm run dev        # Development server at localhost:5173
npm run build      # Production build
npx supabase db push  # Push pending migrations to Supabase
```

## Key Dependencies

- `@supabase/supabase-js` — Database client + auth
- `@tanstack/react-query` — Server state & caching
- `react-router-dom` — Client-side routing
- `tailwindcss` + `@tailwindcss/vite` — Styling
- `xlsx` — Excel export

## Code Principles

- **DRY:** Extract shared logic into hooks (`useObjects`, `useIssues`, `useFilters`).
- **Types first:** All Supabase queries use the types from `src/types/database.ts`.
- **Explicit over clever:** No magic. Readable code wins.
- **Edge cases:** Every list has an empty state. Every async operation has loading and error states.
- **URL-driven filters:** All filter state lives in URL search params, not React state.
- **No premature abstraction:** Build it concrete first, abstract when patterns repeat 3+ times.

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `ObjectList.tsx`, `IssueDetail.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useObjects.ts`, `useFilters.ts`)
- Utilities: `camelCase.ts` (e.g., `aging.ts`, `masking.ts`)
- Types: Already in `src/types/database.ts`
- Pages: `PascalCase.tsx` in `src/pages/` directory

## Testing

No test framework in v1. Manual testing against Supabase with seed data is sufficient. Focus on shipping a working tool.

## Important Notes

- **Migrations**: 11 migration files in `supabase/migrations/`. Push with `npx supabase db push`.
- **Seed data**: `supabase/seed/seed.sql` — replace `USER_ID_HERE` with your Supabase auth user UUID.
- **Types**: `src/types/database.ts` matches the schema exactly. Use these types everywhere.
- **Theming**: CSS custom properties in `src/index.css`. Dark mode by default, light mode via `html.light` class. Theme state managed by `src/lib/ThemeContext.tsx`.
- **Edge Functions**: 3 Deno functions in `supabase/functions/` — `issues-api`, `generate-mom`, `polish-email`.
- **RLS**: All tables have row-level security. The Supabase anon key is safe in client-side code.
- **Environment**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
