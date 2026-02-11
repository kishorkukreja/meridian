# Architecture Context

## System Overview

Meridian is a single-page React application backed by Supabase (hosted Postgres). There is no custom backend server. The React app communicates directly with Supabase via the JS client library.

```
┌─────────────────────────────────────────────────────┐
│                    User Devices                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Laptop  │  │  Mobile  │  │  Teams Browser    │  │
│  │  (R/W)   │  │  (Read)  │  │  (Read)           │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │              │
│       └──────────────┼─────────────────┘              │
│                      │                                │
│              ┌───────▼────────┐                       │
│              │  React SPA     │                       │
│              │  (Vercel)      │                       │
│              └───────┬────────┘                       │
│                      │ Supabase JS Client             │
│              ┌───────▼────────┐                       │
│              │  Supabase      │                       │
│              │  ┌──────────┐  │                       │
│              │  │ Postgres │  │                       │
│              │  │ Auth     │  │                       │
│              │  │ REST API │  │                       │
│              │  │ RLS      │  │                       │
│              │  └──────────┘  │                       │
│              └────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. No Custom Backend
The React app talks directly to Supabase. Supabase auto-generates a REST API from the Postgres schema. Row-Level Security (RLS) handles authorization at the database level.

**Why:** Eliminates an entire layer of code. Auth, API, and database are one service. For a single-user tool, this is the right tradeoff.

### 2. Supabase Row-Level Security
All tables have RLS policies that restrict access to the authenticated user. Even if Supabase credentials leak, data is only accessible to the authenticated session.

```sql
-- Example RLS policy
CREATE POLICY "Users can only access their own data"
ON objects FOR ALL
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
├── AuthGuard                    ← Wraps app, redirects to login if unauthenticated
│   ├── Layout
│   │   ├── Sidebar              ← Navigation: Objects, Issues, Archive
│   │   └── MainContent
│   │       ├── ObjectListPage   ← Filtered/sorted list of all objects
│   │       ├── ObjectDetailPage ← Single object: lifecycle + linked issues
│   │       ├── IssueListPage    ← Filtered/sorted list of all issues
│   │       ├── IssueDetailPage  ← Single issue: full detail + decision
│   │       └── ArchivePage      ← Closed/archived items
│   └── MobileNav                ← Bottom tab nav for small screens
└── LoginPage                    ← Email/password auth
```

## Data Flow Patterns

### Reading Data
```
Component → useQuery hook → Supabase client → Postgres → Response → Cache → Render
```

### Writing Data
```
Component → Form submit → useMutation hook → Supabase client → Postgres → Invalidate cache → Re-render
```

### Filtering
Filters are URL query params. This means:
- Filtered views are bookmarkable/shareable
- Browser back/forward works naturally
- State is not lost on refresh

Example: `/objects?module=DP&status=stuck&source=SAP-SCC`

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

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are safe to expose in the client because RLS protects the data. The anon key only grants access that RLS policies allow.

## Responsive Strategy

- **Desktop (>1024px):** Sidebar navigation, full table views with all columns
- **Tablet (768-1024px):** Collapsible sidebar, condensed tables
- **Mobile (<768px):** Bottom tab navigation, card-based layouts instead of tables, swipe gestures for status updates (future)

Mobile is read-optimized. Write operations use full-width forms that work on mobile but are primarily designed for desktop use.
