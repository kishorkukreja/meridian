# S&OP Data Program Tracker - Master Plan

## Project Codename: **Meridian**

## What This Is

A personal program tracking tool for managing a large-scale S&OP data migration to o9 Solutions. It solves two problems:

1. **Tracking:** End-to-end visibility of every data object's journey through the migration lifecycle, with linked issue tracking when things get stuck.
2. **Communication:** Layered views that serve different audiences - from a 30-second leadership summary to a granular data steward view.

## Who It's For

- **Primary user:** The DNA (Data & Analytics) Lead - single writer, needs full control.
- **Secondary users (future):** Other team leads who may onboard later as read-only viewers.
- **Mobile access:** Read-only from any device via browser (Teams embedded browser, phone browser, etc.).

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React (Vite) | Fast, lightweight, no SSR needed |
| Styling | Tailwind CSS | Utility-first, rapid iteration |
| Database | Supabase (Postgres) | Free tier, built-in auth, REST API, RLS |
| Auth | Supabase Auth | Email/password, single user to start |
| Hosting | Vercel | Free tier, instant deploys, HTTPS |
| State | React Query (TanStack) | Caching, background refetches |

## Data Anonymization

All data stored in Supabase is masked. No real client names, system names, entity names, or employee names. A masking convention is applied at the point of data entry. See `docs/masking/CONTEXT.md` for the full convention.

## Core Concepts

### The Two Layers

**Layer 1 - Object Lifecycle Tracker (the spine)**
Every data object (e.g., Item Master, Drivers, Priority 1 objects) has a defined lifecycle:

```
Requirements → Mapping → Extraction → Ingestion → Transformation → Push to Target → Validation → Sign-off → Live
```

Each object is tracked through these stages. This is the progress view. It answers: "Where are we?"

**Layer 2 - Issue Register (the nervous system)**
When an object is stuck at a lifecycle stage, issues explain why. Each issue is linked to an object and its current lifecycle stage. Issues carry metadata: type, owner, status, decision, dependencies.

### Supporting Features

- **Decision Log:** Captured as part of issue resolution. Every closed issue records the decision made.
- **Dependency Flags:** Issues and objects can reference blockers ("blocked by Object X completing Stage Y").
- **Aging:** Auto-calculated time an object has been at its current stage. Early warning for silent blockers.
- **Archiving:** Closed items are filtered out of default views. Items closed for 30+ days move to archive tables.

## Module Structure (Domain Context)

The program covers two main modules, each with sub-objects:

### Demand Planning (DP)
- Master Data objects
- Driver objects

### Supply Planning (SP)
- Master Data objects
- Priority 1 objects (Group Planning)
- Priority 2 objects (S3D, SLB)
- Priority 3 objects (IBP)

### Source Systems
Data flows from multiple sources:
- SAP SCC
- Manual files / spreadsheets
- External providers (masked as EXT-1, EXT-2, etc.)
- Enterprise data lakes
- Sub-systems

### Data Flow
Sources → Data Warehouse / Data Grid → SFTP → o9

## Stakeholder Map (for context, not stored in app)

| Role | Function |
|------|----------|
| DNA Lead (you) | Understands right data, right dataset, right flow |
| MDS Team (per module) | Digital/business transformation for each module |
| Data Enablement Team | Ingests data from sources into data lake |
| o9 Integration Team | Pushes data from data lake to o9 via SFTP |
| Business Users | Source of truth for requirements and validation |
| Leadership | Regional leads, o9 leads, DNA lead, data stewards, directors, VPs |

## MVP Scope (v1)

### In Scope
- Object register: CRUD for data objects with module/region assignment
- Lifecycle tracking: Visual stage progression per object
- Issue register: Log issues linked to object + lifecycle stage
- Decision capture on issue closure
- Dependency references (simple "blocked by" text field)
- Aging calculation (auto, based on stage entry timestamp)
- Filtered views: by module, source system, status, owner, issue type
- Single-user auth via Supabase
- Responsive design (mobile read-friendly)

### Out of Scope (v2+)
- Leadership dashboards with charts/graphs
- Multi-user write access with role-based permissions
- Notifications / alerts
- Reporting / export to PowerPoint
- Integration with Teams or Slack
- Bulk import from existing Excel trackers

## File Structure

```
snop-tracker/
├── MASTERPLAN.md                    ← You are here
├── docs/
│   ├── architecture/
│   │   └── CONTEXT.md               ← System architecture, component map, data flow
│   ├── data-model/
│   │   └── CONTEXT.md               ← Full schema, relationships, enums
│   ├── features/
│   │   ├── 01-object-lifecycle.md    ← Object register + lifecycle tracker spec
│   │   ├── 02-issue-register.md      ← Issue register spec
│   │   ├── 03-views-and-filters.md   ← Filtering, sorting, default views
│   │   ├── 04-aging.md               ← Aging logic and display
│   │   └── 05-archiving.md           ← Archiving rules and cleanup
│   ├── deployment/
│   │   └── CONTEXT.md               ← Vercel + Supabase setup instructions
│   ├── masking/
│   │   └── CONTEXT.md               ← Data anonymization convention
│   └── design/
│       └── CONTEXT.md               ← UI/UX direction, component patterns
├── src/
│   ├── components/                   ← Reusable UI components
│   ├── pages/                        ← Route-level page components
│   ├── lib/                          ← Supabase client, utilities
│   ├── hooks/                        ← Custom React hooks
│   └── types/                        ← TypeScript type definitions
├── supabase/
│   ├── migrations/                   ← SQL migration files
│   └── seed/                         ← Seed data for development
└── public/                           ← Static assets
```

## Build Sequence

Claude Code should build in this order:

1. **Database first:** Run `docs/data-model/CONTEXT.md` → create Supabase migrations
2. **Auth:** Set up Supabase auth + React auth wrapper
3. **Object Lifecycle:** Build the object register and lifecycle stage UI
4. **Issue Register:** Build issue logging linked to objects
5. **Views & Filters:** Add filtering, sorting, default views
6. **Aging:** Add computed aging display
7. **Archiving:** Add archive logic and cleanup
8. **Polish:** Responsive design, mobile optimization, edge cases
9. **Deploy:** Vercel + Supabase production setup

## Guiding Principles

- **DRY:** No duplicated logic. Shared utilities, shared types.
- **Explicit over clever:** Readable code wins over compact code.
- **Edge cases matter:** Empty states, error states, loading states - all handled.
- **Mobile-first reading:** The read experience must work on a phone screen.
- **No premature optimization:** Build it, use it, then optimize what hurts.
