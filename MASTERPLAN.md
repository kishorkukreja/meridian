# S&OP Data Program Tracker - Master Plan

## Project Codename: **Meridian**

*Last updated: February 2026*

## What This Is

A personal program tracking tool for managing a large-scale S&OP data migration to o9 Solutions. It solves three problems:

1. **Tracking:** End-to-end visibility of every data object's journey through the migration lifecycle, with linked issue tracking when things get stuck.
2. **Communication:** Layered views that serve different audiences -- from a 30-second leadership summary (dashboard) to a granular data steward view (object detail pages).
3. **Collaboration:** Meeting minutes, action items, AI-generated summaries, and email drafts that turn tracker data into outward-facing communication.

## Who It's For

- **Primary user:** The DNA (Data & Analytics) Lead -- single writer, full control.
- **Secondary users (future):** Other team leads who may onboard later as read-only viewers.
- **External integrations:** CI pipelines and scripts can push issue data via the External Issues API.
- **Mobile access:** Responsive design with dedicated mobile bottom navigation and card layouts.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React (Vite, TypeScript) | Fast, lightweight, no SSR needed |
| Styling | Tailwind CSS | Utility-first, rapid iteration |
| Database | Supabase (Postgres) | Free tier, built-in auth, REST API, RLS |
| Auth | Supabase Auth | Email/password, single user |
| AI | Google Gemini 2.5 Flash/Pro | Meeting summarization, email polish |
| Edge Functions | Supabase Edge Functions (Deno) | Server-side AI calls, external API |
| Hosting | Vercel | Free tier, instant deploys, HTTPS |
| State | TanStack React Query | Caching, background refetches, optimistic updates |

## Data Anonymization

All data stored in Supabase is masked. No real client names, system names, entity names, or employee names. A masking convention is applied at the point of data entry. See `docs/masking/CONTEXT.md` for the full convention.

## Core Concepts

### The Two Layers

**Layer 1 -- Object Lifecycle Tracker (the spine)**
Every data object (e.g., Item Master, Drivers, Priority 1 objects) has a defined 9-stage lifecycle:

```
Requirements -> Mapping -> Extraction -> Ingestion -> Transformation -> Push to Target -> Validation -> Sign-off -> Live
```

Each object is tracked through these stages. This is the progress view. It answers: "Where are we?"

**Layer 2 -- Issue Register (the nervous system)**
When an object is stuck at a lifecycle stage, issues explain why. Each issue is linked to an object and its current lifecycle stage. Issues carry metadata: type, owner, status, decision, dependencies.

### Supporting Systems

- **Decision Log:** Captured as part of issue resolution. Every closed issue records the decision made.
- **Dependency Flags:** Issues and objects can reference blockers ("blocked by Object X completing Stage Y").
- **Aging:** Auto-calculated time an object has been at its current stage. Early warning for silent blockers.
- **Archiving:** Closed items are filtered out of default views. Items closed for 30+ days move to archive tables.
- **Comments:** Threaded comments on both objects and issues (polymorphic `meridian_comments` table).
- **Meetings:** Record meetings with transcripts, get AI-generated summaries, track action items.
- **Pins:** Star/favorite objects and issues for quick dashboard access.

## Module Structure (Domain Context)

The program covers five modules:

| Module | Domain |
|--------|--------|
| Demand Planning | Demand-side master data and drivers |
| Supply Planning | Supply-side master data, priority objects |
| Supply Planning -- IBP | Integrated Business Planning objects |
| Data Infrastructure & Enterprise | Cross-cutting data platform and enterprise systems |
| Program Management | Program-level coordination and governance |

### Source Systems
Data flows from multiple sources:
- SAP SCC
- Manual files / spreadsheets
- External providers (masked as EXT-1, EXT-2, etc.)
- Enterprise data lakes
- Sub-systems

### Data Flow
Sources -> Data Warehouse / Data Grid -> SFTP -> o9

## Stakeholder Map (for context, not stored in app)

| Role | Function |
|------|----------|
| DNA Lead (you) | Understands right data, right dataset, right flow |
| MDS Team (per module) | Digital/business transformation for each module |
| Data Enablement Team | Ingests data from sources into data lake |
| o9 Integration Team | Pushes data from data lake to o9 via SFTP |
| Business Users | Source of truth for requirements and validation |
| Leadership | Regional leads, o9 leads, DNA lead, data stewards, directors, VPs |

---

## Feature Inventory

Everything below is built and deployed.

### Core Tracking

| Feature | Description |
|---------|-------------|
| Object Register | CRUD for data objects with module, region, source system, and owner assignment |
| Lifecycle Stepper | Visual 9-stage progression per object with stage history timestamps |
| Issue Register | Log issues linked to object + lifecycle stage, with type/owner/status metadata |
| Decision Capture | Every resolved issue records the decision made and resolution context |
| Dependency References | "Blocked by" text fields on issues and linked object IDs on objects |
| Aging Computation | Auto-calculated days at current stage, displayed as color-coded badges |
| Next Action Tracking | Per-object next action text and due date for operational planning |

### Filtered Views and Navigation

| Feature | Description |
|---------|-------------|
| Filter Bar | Filter by module, source system, status, owner, issue type, lifecycle stage |
| URL-Driven Filters | All filter state lives in URL search params, enabling shareable/bookmarkable views |
| Saved Views | Pre-built view chips (e.g., "Stuck items", "My issues", "Needs decision") |
| Sort Controls | Sort by name, stage, aging, status, created date |
| Summary Bars | Aggregate counts and status breakdowns on list pages |
| Global Search | Full-text search across objects, issues, meetings, and comments |

### Dashboard and Reports

| Feature | Description |
|---------|-------------|
| KPI Cards | At-a-glance counts for objects, issues, and key metrics |
| Pipeline Funnel | Visual funnel chart showing objects at each lifecycle stage |
| Status Donuts | Donut charts for object and issue status distribution |
| Module Comparison | Side-by-side progress comparison across all five modules |
| Next Action Summary | Aggregated view of upcoming actions and due dates |
| Issue Type Breakdown | Distribution of issues by type (data quality, mapping, access, etc.) |
| Upcoming Schedule | Next scheduled meetings and recurring meeting instances |
| Recent Meetings | Quick access to the latest meeting records |
| Recent Activity Feed | Timeline of recent changes across objects and issues |
| Pinned Items | Dashboard section showing user-starred objects and issues |
| Reports Page | Dedicated analytics page with deeper data visualizations |

### Meetings System

| Feature | Description |
|---------|-------------|
| Meeting Records | Create meeting records with title, date, attendees, and transcript |
| Three Meeting Types | Full Minutes of Meeting (MoM), Quick Summary, AI Conversation |
| AI Summarization | Gemini-powered extraction of TLDR, discussion points, next steps, action log, and inspirational quote from meeting transcripts |
| Recurring Meetings | Define recurring meeting schedules with frequency and participants |
| Schedule Calendar | Calendar view of upcoming and past meeting occurrences |
| Voice Input | Speech-to-text input for AI conversation meeting type |

### AI Features

| Feature | Description |
|---------|-------------|
| Meeting Summarization | Edge function `generate-mom`: sends transcript to Gemini, returns structured summary |
| Email Draft | Edge function `polish-email`: takes an issue comment and polishes it into a professional email draft |
| AI Conversation | Interactive meeting type where voice/text input is processed by Gemini |

### External Integration

| Feature | Description |
|---------|-------------|
| External Issues API | Edge function `issues-api`: RESTful API with token-based auth for external tools, scripts, and CI pipelines to create/read/update issues |
| API Token Management | In-app UI to create, revoke, and delete API tokens with configurable scopes |

### Data Management

| Feature | Description |
|---------|-------------|
| Bulk CSV Import | Drag-and-drop CSV upload for objects and issues with validation, preview, and batch inserts |
| Archive Page | Dedicated page for completed/closed items with restore capability |
| Bulk Actions | Multi-select rows on list pages to change status or owner in batch |

### Comments and Collaboration

| Feature | Description |
|---------|-------------|
| Comments System | Threaded comments on objects and issues via polymorphic `meridian_comments` table |
| Email from Comment | One-click conversion of a comment into a polished email draft via Gemini |
| Convert to Issue | Create an issue directly from a comment thread |

### UI and Experience

| Feature | Description |
|---------|-------------|
| Dark/Light Mode | Toggle between themes with localStorage persistence |
| Responsive Layout | Desktop sidebar navigation + mobile bottom navigation bar |
| Mobile Card Layouts | Touch-friendly card views on small screens |
| Pin/Favorites | Star objects and issues for quick access on the dashboard |
| Loading Skeletons | Shimmer placeholders during data fetches |
| Empty States | Contextual empty state illustrations and messages on every list |
| Error Handling | Graceful error boundaries and toast notifications |

---

## Database Schema

### Tables (9)

| Table | Purpose |
|-------|---------|
| `meridian_objects` | Data objects with lifecycle stage, module, owner, aging, next action |
| `meridian_issues` | Issues linked to objects and lifecycle stages |
| `meridian_stage_history` | Timestamp log of every stage transition per object |
| `meridian_comments` | Polymorphic comments on objects and issues |
| `meridian_meetings` | Meeting records with transcripts and AI summaries |
| `meridian_recurring_meetings` | Recurring meeting definitions (frequency, participants) |
| `meridian_schedule_logs` | Generated meeting occurrences from recurring schedules |
| `meridian_api_tokens` | API tokens for external integrations |
| `meridian_pins` | User-pinned/favorited objects and issues |

### Migrations (11)

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: objects, issues, stage history, RLS policies |
| `002_comments.sql` | Polymorphic comments table |
| `003_meetings.sql` | Meetings table |
| `004_meeting_type.sql` | Meeting type enum (full MoM, quick summary, AI conversation) |
| `005_recurring_meetings.sql` | Recurring meetings and schedule logs |
| `006_api_tokens.sql` | API token management table |
| `007_next_action.sql` | Next action and due date fields on objects |
| `008_linked_object_ids.sql` | Linked object ID references for cross-object dependencies |
| `009_more_modules.sql` | Expanded module list (IBP, Data Infrastructure, Program Management) |
| `010_meeting_quote.sql` | Inspirational quote field on meeting summaries |
| `011_pins.sql` | Pins/favorites table |

### Edge Functions (3)

| Function | Purpose |
|----------|---------|
| `generate-mom` | Sends meeting transcript to Gemini 2.5 Flash/Pro, returns structured MoM (TLDR, discussion points, next steps, action log, quote) |
| `polish-email` | Takes an issue comment and returns a polished professional email draft via Gemini |
| `issues-api` | RESTful API with bearer token auth for external systems to create, read, and update issues |

---

## File Structure

```
snop-tracker/
├── MASTERPLAN.md                         <- You are here
├── CLAUDE.md                             <- Claude Code instructions
├── docs/
│   ├── architecture/
│   │   └── CONTEXT.md                    <- System architecture, component map, data flow
│   ├── data-model/
│   │   └── CONTEXT.md                    <- Full schema, relationships, enums
│   ├── features/
│   │   ├── 01-object-lifecycle.md        <- Object register + lifecycle tracker spec
│   │   ├── 02-issue-register.md          <- Issue register spec
│   │   ├── 03-views-and-filters.md       <- Filtering, sorting, default views
│   │   ├── 04-aging.md                   <- Aging logic and display
│   │   ├── 05-archiving.md              <- Archiving rules and cleanup
│   │   ├── 06-excel-export.md           <- Export functionality spec
│   │   ├── 07-reports.md               <- Reports page spec
│   │   ├── 08-dashboard.md             <- Dashboard and analytics spec
│   │   ├── 09-bulk-actions.md           <- Bulk actions spec
│   │   ├── 10-comments.md              <- Comments system spec
│   │   └── 11-external-api.md           <- External Issues API spec
│   ├── deployment/
│   │   └── CONTEXT.md                    <- Vercel + Supabase setup instructions
│   ├── masking/
│   │   └── CONTEXT.md                    <- Data anonymization convention
│   └── design/
│       └── CONTEXT.md                    <- UI/UX direction, component patterns
├── src/
│   ├── components/                       <- Reusable UI components
│   ├── pages/                            <- Route-level page components
│   ├── lib/                              <- Supabase client, utilities
│   ├── hooks/                            <- Custom React hooks
│   └── types/                            <- TypeScript type definitions
├── supabase/
│   ├── migrations/                       <- 11 SQL migration files
│   ├── functions/                        <- 3 Deno edge functions
│   └── seed/                             <- Seed data for development
└── public/                               <- Static assets
```

### Pages (19)

```
src/pages/
├── LoginPage.tsx                   <- Supabase auth login
├── DashboardPage.tsx               <- KPI cards, charts, activity feed, pinned items
├── ObjectListPage.tsx              <- Object register with filters, summary bar, bulk actions
├── ObjectDetailPage.tsx            <- Object detail with lifecycle stepper, comments, issues
├── ObjectFormPage.tsx              <- Create/edit object form
├── IssueListPage.tsx               <- Issue register with filters, summary bar, bulk actions
├── IssueDetailPage.tsx             <- Issue detail with decision capture, comments
├── IssueFormPage.tsx               <- Create/edit issue form
├── ArchivePage.tsx                 <- Archived objects and issues
├── ReportsPage.tsx                 <- Analytics and reporting
├── ImportPage.tsx                  <- Bulk CSV import with drag-drop and validation
├── MeetingListPage.tsx             <- Meeting records list
├── MeetingDetailPage.tsx           <- Meeting detail with AI summary
├── MeetingFormPage.tsx             <- Create meeting form
├── MeetingEditPage.tsx             <- Edit meeting form
├── RecurringMeetingListPage.tsx    <- Recurring meeting definitions
├── RecurringMeetingFormPage.tsx    <- Create/edit recurring meeting
├── SchedulePage.tsx                <- Calendar view of meeting schedule
└── ApiTokensPage.tsx               <- API token management
```

---

## Build History

The app was built incrementally, following this sequence:

1. Database schema and initial migration
2. Supabase auth + React auth wrapper
3. Object lifecycle tracker with stepper UI
4. Issue register linked to objects
5. Filtered views with URL-driven state and saved view chips
6. Aging computation and badge display
7. Archive page and archive actions
8. Summary bars on list pages
9. Responsive design (mobile card layouts, bottom nav)
10. Comments system on objects and issues
11. Dashboard with KPI cards, charts, and activity feed
12. Reports page with analytics
13. Meetings system (records, transcripts, three types)
14. AI meeting summarization via Gemini edge function
15. Recurring meetings and schedule calendar
16. External Issues API with token auth
17. API token management UI
18. Email draft from comment via Gemini edge function
19. Dark/light mode toggle
20. Pin/favorites system
21. Bulk CSV import
22. Global search
23. Bulk actions (multi-select status/owner changes)
24. Expanded module structure (5 modules from original 2)
25. Next action tracking on objects
26. Voice input for AI conversations

---

## Future Scope (v3+)

These items are not yet built and remain potential future additions:

| Feature | Notes |
|---------|-------|
| Multi-user write access | Role-based permissions, team member accounts, activity attribution |
| Teams / Slack integration | Push notifications for status changes, issue assignments, meeting reminders |
| Export to PowerPoint | Generate slide decks from dashboard data for leadership presentations |
| Notifications / alerts | In-app and email notifications for aging thresholds, assignment changes |
| Audit log | Full change history with user attribution (requires multi-user first) |
| Offline support | Service worker caching for read access without connectivity |

---

## Guiding Principles

These principles have guided the build from day one and remain in effect:

- **DRY:** No duplicated logic. Shared utilities, shared types.
- **Explicit over clever:** Readable code wins over compact code.
- **Edge cases matter:** Empty states, error states, loading states -- all handled.
- **Mobile-first reading:** The read experience must work on a phone screen.
- **No premature optimization:** Build it, use it, then optimize what hurts.
- **URL as source of truth:** Filter state lives in the URL, not in React state.
- **Types everywhere:** All Supabase queries use the TypeScript types from `src/types/database.ts`.
- **Ship, then polish:** Get it working first, refine based on real usage.
