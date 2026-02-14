# Architecture Context

## System Overview

Meridian is a single-page React application backed by Supabase (hosted Postgres). There is no custom backend server -- the React app communicates directly with Supabase via the JS client library. The one exception is Supabase Edge Functions, which handle AI-powered features (meeting-minutes generation, email polishing) and external API integrations that require server-side secrets.

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Devices                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐              │
│  │  Laptop  │  │  Mobile  │  │  Teams Browser    │              │
│  │  (R/W)   │  │  (Read)  │  │  (Read)           │              │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘              │
│       │              │                 │                         │
│       └──────────────┼─────────────────┘                         │
│                      │                                           │
│              ┌───────▼────────┐                                  │
│              │  React SPA     │                                  │
│              │  (Vercel)      │                                  │
│              └──┬──────────┬──┘                                  │
│                 │          │                                      │
│    Supabase JS  │          │ Edge Function calls                 │
│    Client       │          │ (via supabase.functions.invoke)     │
│                 │          │                                      │
│              ┌──▼──────────▼──┐       ┌────────────────────┐     │
│              │  Supabase       │       │  External APIs     │     │
│              │  ┌────────────┐ │       │  ┌──────────────┐  │    │
│              │  │ Postgres   │ │       │  │ Gemini AI    │  │    │
│              │  │ Auth       │ │       │  └──────────────┘  │    │
│              │  │ REST API   │ │       └────────────────────┘    │
│              │  │ RLS        │ │              ▲                   │
│              │  │ Edge Funcs │─┼──────────────┘                  │
│              │  └────────────┘ │                                  │
│              └─────────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. No Custom Backend (Edge Functions as the Exception)

The React app talks directly to Supabase. Supabase auto-generates a REST API from the Postgres schema. Row-Level Security (RLS) handles authorization at the database level.

The exception is Supabase Edge Functions, used for operations that require server-side secrets or external API calls:

- **`generate-mom`** -- Sends meeting transcripts to Google Gemini to generate structured minutes of meeting (MoM).
- **`polish-email`** -- Uses Gemini to rewrite or polish email drafts.
- **`issues-api`** -- Provides a token-authenticated REST endpoint for external integrations (e.g., reading/writing issues programmatically).

**Why:** Eliminates an entire layer of code for 95% of operations. Auth, API, and database are one service. Edge Functions handle the remaining 5% where server-side logic is unavoidable.

### 2. Supabase Row-Level Security

All tables have RLS policies that restrict access to the authenticated user. Even if Supabase credentials leak, data is only accessible to the authenticated session.

```sql
-- Example RLS policy
CREATE POLICY "Users can only access their own data"
ON meridian_objects FOR ALL
USING (auth.uid() = user_id);
```

### 3. React Query for Server State

All Supabase reads go through TanStack React Query. This gives us:
- Automatic caching (no redundant fetches)
- Background refetches (data stays fresh)
- Optimistic updates (UI feels instant)
- Loading/error states handled consistently

### 4. No SSR / No Next.js

This is a tool, not a content site. SEO is irrelevant. SSR adds complexity for zero benefit. Vite + React gives us the fastest dev experience.

### 5. Client-Side Computed Fields

Fields like "aging" (days at current stage) are computed in the React app, not stored in the database. This avoids stale data and scheduled jobs. The computation is trivial: `today - stage_entered_at`.

## Component Architecture

```
App
├── ThemeProvider                      <- Light/dark mode via ThemeContext
│   └── AuthGuard                     <- Wraps app, redirects to login if unauthenticated
│       ├── Layout
│       │   ├── Sidebar               <- Navigation: Dashboard, Objects, Issues,
│       │   │                             Meetings, Schedule, Reports, Archive, Import,
│       │   │                             Settings (API Tokens)
│       │   ├── GlobalSearch           <- Search across objects, issues, meetings
│       │   └── MainContent
│       │       ├── DashboardPage      <- Summary cards, charts, pinned items
│       │       │
│       │       ├── ObjectListPage     <- Filtered/sorted list of all objects
│       │       ├── ObjectDetailPage   <- Single object: lifecycle stepper + linked issues
│       │       │   ├── LifecycleStepper
│       │       │   ├── CommentSection
│       │       │   ├── PinButton
│       │       │   ├── StatusBadge
│       │       │   └── AgingBadge
│       │       ├── ObjectFormPage     <- Create/edit object
│       │       │
│       │       ├── IssueListPage      <- Filtered/sorted list of all issues
│       │       ├── IssueDetailPage    <- Single issue: full detail + decision
│       │       │   ├── CommentSection
│       │       │   ├── PinButton
│       │       │   └── StatusBadge
│       │       ├── IssueFormPage      <- Create/edit issue
│       │       │
│       │       ├── MeetingListPage    <- List of all meetings
│       │       ├── MeetingDetailPage  <- Single meeting: MoM, action items, links
│       │       ├── MeetingFormPage    <- Create new meeting (with AI generation)
│       │       ├── MeetingEditPage    <- Edit existing meeting
│       │       │
│       │       ├── SchedulePage       <- Calendar/schedule view of recurring meetings
│       │       ├── RecurringMeetingListPage  <- Manage recurring meeting definitions
│       │       ├── RecurringMeetingFormPage  <- Create/edit recurring meeting
│       │       │
│       │       ├── ReportsPage        <- Aggregated views and exportable reports
│       │       ├── ArchivePage        <- Closed/archived items
│       │       ├── ImportPage         <- CSV/bulk import for objects and issues
│       │       └── ApiTokensPage      <- Manage API tokens for external integrations
│       │
│       └── MobileNav                  <- Bottom tab nav for small screens
│
└── LoginPage                          <- Email/password auth
```

## Shared Components

| Component | Purpose |
|-----------|---------|
| `StatusBadge` | Colored badge for object/issue status values |
| `AgingBadge` | Visual indicator for days-at-stage with threshold coloring |
| `LifecycleStepper` | Horizontal/vertical stepper showing object progression through stages |
| `PinButton` | Toggle pin/unpin for objects and issues (appears on dashboard) |
| `CommentSection` | Polymorphic comment thread for objects and issues |
| `LoadingSkeleton` | Placeholder shimmer UI shown during data fetches |
| `GlobalSearch` | Command-palette style search across all entities |

## Custom Hooks

| Hook | Data Source | Purpose |
|------|-------------|---------|
| `useObjects` | `meridian_objects` | CRUD operations and filtered queries for objects |
| `useIssues` | `meridian_issues` | CRUD operations and filtered queries for issues |
| `useComments` | `meridian_comments` | Read/write comment threads (polymorphic by entity type) |
| `useMeetings` | `meridian_meetings` | CRUD for meetings, AI generation via edge functions |
| `useSchedule` | `meridian_recurring_meetings`, `meridian_schedule_logs` | Recurring meeting management and occurrence tracking |
| `useApiTokens` | `meridian_api_tokens` | Token creation, listing, and revocation |
| `usePins` | `meridian_pins` | Pin/unpin entities for quick access on the dashboard |
| `useFilters` | URL search params | Read/write filter state from URL query parameters |
| `useStageHistory` | `meridian_stage_history` | Fetch stage transition audit trail for an object |
| `useVoiceInput` | Browser Web Speech API | Voice-to-text input for transcript and note fields |

## Lib / Utilities

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client initialization (typed with `Database`) |
| `AuthContext.tsx` | Auth state provider: session, user, login/logout methods |
| `ThemeContext.tsx` | Theme state provider: light/dark mode toggle |
| `aging.ts` | Aging computation helpers and threshold definitions |
| `constants.ts` | Enum labels, stage ordering, color mappings |
| `csvParser.ts` | CSV parsing logic for the bulk import feature |
| `savedViews.ts` | LocalStorage-backed saved filter presets |

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | -- | Redirects to `/dashboard` |
| `/dashboard` | `DashboardPage` | Summary cards, charts, pinned items |
| `/objects` | `ObjectListPage` | Filtered list of all data objects |
| `/objects/new` | `ObjectFormPage` | Create a new object |
| `/objects/:id` | `ObjectDetailPage` | Object detail with lifecycle stepper |
| `/objects/:id/edit` | `ObjectFormPage` | Edit an existing object |
| `/issues` | `IssueListPage` | Filtered list of all issues |
| `/issues/new` | `IssueFormPage` | Create a new issue |
| `/issues/:id` | `IssueDetailPage` | Issue detail with decision capture |
| `/issues/:id/edit` | `IssueFormPage` | Edit an existing issue |
| `/reports` | `ReportsPage` | Aggregated reports and export |
| `/meetings` | `MeetingListPage` | List of all meetings |
| `/meetings/new` | `MeetingFormPage` | Create a new meeting (with AI) |
| `/meetings/:id` | `MeetingDetailPage` | Meeting detail: MoM, actions, links |
| `/meetings/:id/edit` | `MeetingEditPage` | Edit an existing meeting |
| `/schedule` | `SchedulePage` | Upcoming schedule from recurring meetings |
| `/schedule/manage` | `RecurringMeetingListPage` | Manage recurring meeting definitions |
| `/schedule/new` | `RecurringMeetingFormPage` | Create a new recurring meeting |
| `/schedule/:id/edit` | `RecurringMeetingFormPage` | Edit an existing recurring meeting |
| `/settings/api` | `ApiTokensPage` | Manage API tokens |
| `/archive` | `ArchivePage` | View archived objects and issues |
| `/import` | `ImportPage` | Bulk import via CSV |

## Data Flow Patterns

### Reading Data
```
Component -> useQuery hook -> Supabase client -> Postgres -> Response -> Cache -> Render
```

### Writing Data
```
Component -> Form submit -> useMutation hook -> Supabase client -> Postgres -> Invalidate cache -> Re-render
```

### AI-Powered Operations (Edge Functions)
```
Component -> supabase.functions.invoke('generate-mom', { body }) -> Edge Function -> Gemini API -> Response -> Render
```

### External API Access (Token-Authenticated)
```
External Client -> POST /issues-api (Bearer token) -> Edge Function -> Validate token against meridian_api_tokens -> Postgres -> Response
```

### Filtering
Filters are URL query params. This means:
- Filtered views are bookmarkable/shareable
- Browser back/forward works naturally
- State is not lost on refresh

Example: `/objects?module=demand_planning&status=blocked&source=erp_primary`

## Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

## Environment Variables

### Client-Side (Vite)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are safe to expose in the client because RLS protects the data. The anon key only grants access that RLS policies allow.

### Edge Function Secrets
```
GEMINI_API_KEY=...    # Google Gemini API key, stored as a Supabase secret
```

This key is never exposed to the client. It is only accessible within edge function execution.

## Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generate-mom` | `MeetingFormPage` / `MeetingEditPage` | Sends transcript to Gemini, returns structured MoM (TLDR, discussion points, next steps, action log) |
| `polish-email` | Various | Rewrites or polishes text using Gemini |
| `issues-api` | External HTTP | Token-authenticated REST endpoint for reading/writing issues from external tools |

## Responsive Strategy

- **Desktop (>1024px):** Sidebar navigation, full table views with all columns
- **Tablet (768-1024px):** Collapsible sidebar, condensed tables
- **Mobile (<768px):** Bottom tab navigation, card-based layouts instead of tables, swipe gestures for status updates (future)

Mobile is read-optimized. Write operations use full-width forms that work on mobile but are primarily designed for desktop use.
