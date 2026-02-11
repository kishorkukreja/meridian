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

## Build Sequence

Follow this order strictly:

1. `npm create vite@latest . -- --template react-ts` + install dependencies
2. Set up Supabase client (`src/lib/supabase.ts`)
3. Set up auth (login page, auth context, route guards)
4. Build Object List page with filters
5. Build Object Detail page with lifecycle stepper
6. Build Issue List page with filters
7. Build Issue Detail page with decision capture
8. Build Create/Edit forms for objects and issues
9. Add aging computation and display
10. Add archive page and archive actions
11. Add summary bar / counts to list pages
12. Responsive design pass (mobile card layouts, bottom nav)
13. Final polish: empty states, loading skeletons, error handling

## Dependencies to Install

```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

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

- The database migration is ready at `supabase/migrations/001_initial_schema.sql`. Run it in Supabase SQL Editor.
- Seed data is at `supabase/seed/seed.sql`. Replace `USER_ID_HERE` with your actual Supabase auth user UUID.
- The TypeScript types at `src/types/database.ts` match the schema exactly. Use them everywhere.
- Design tokens (colors, fonts) are defined in `docs/design/CONTEXT.md`. Implement them as Tailwind config extensions.
- RLS is already configured in the migration. The Supabase anon key is safe in client-side code.
