# Feature: In-App Reports

## Purpose
Provide the DNA Lead with a dedicated reports page showing program health, progress velocity, and bottleneck analysis. Reports are configurable by date range, module, and breakdown dimension. All report views are exportable to Excel.

## User Stories

1. **As the DNA Lead, I want to** see a module-level progress comparison **so that** I know if Demand Planning or Supply Planning is falling behind.
2. **As the DNA Lead, I want to** see how many objects are at each lifecycle stage **so that** I can identify pipeline bottlenecks.
3. **As the DNA Lead, I want to** see workload distribution by owner/team **so that** I can rebalance assignments.
4. **As the DNA Lead, I want to** see week-over-week trends **so that** I can report velocity to the steering committee.

## Navigation

- New sidebar item: "Reports" (between Issues and Archive)
- Route: `/reports`
- Icon: Bar chart

## Report Page Layout

### Controls Bar
Top of page, horizontal layout:

| Control | Type | Default |
|---------|------|---------|
| Date Range | Preset dropdown (Last 7d, 30d, 90d, All Time) | Last 30d |
| Module | Dropdown (All, Demand Planning, Supply Planning) | All |
| Export | Button → Downloads current report as Excel | - |

### Report Sections

The page is divided into 4 report cards, each with a title, chart, and supporting data table.

---

## Report 1: Progress by Module

**Purpose:** Compare Demand Planning vs Supply Planning at a glance.

### Visualization
Horizontal stacked bar chart. One bar per module showing objects colored by status (on_track / at_risk / blocked / completed).

### Data Table

| Module | Total | On Track | At Risk | Blocked | Completed | Avg Aging |
|--------|-------|----------|---------|---------|-----------|-----------|
| Demand Planning | N | N | N | N | N | Nd |
| Supply Planning | N | N | N | N | N | Nd |

---

## Report 2: Pipeline by Stage

**Purpose:** Show how objects are distributed across the 9 lifecycle stages to identify bottlenecks.

### Visualization
Vertical bar chart. One bar per lifecycle stage (x-axis: 9 stages, y-axis: object count). Bars colored using stage gradient colors.

### Data Table

| Stage | Count | % of Total | Avg Days at Stage | Blocked Count |
|-------|-------|------------|-------------------|---------------|
| Requirements | N | N% | Nd | N |
| Mapping | N | N% | Nd | N |
| ... | ... | ... | ... | ... |
| Live | N | N% | - | - |

### Bottleneck Indicator
Highlight the stage with the highest count in amber. If any stage has >40% of total objects, show a warning callout.

---

## Report 3: Workload by Owner / Team

**Purpose:** Show workload distribution to identify overloaded or unassigned areas.

### Visualization
Horizontal bar chart. One bar per owner (or team, togglable). Bar length = object count, segmented by status.

### Data Table

| Owner | Objects | On Track | At Risk | Blocked | Open Issues |
|-------|---------|----------|---------|---------|-------------|
| LEAD-DNA-01 | N | N | N | N | N |
| ENG-ENB-01 | N | N | N | N | N |
| (Unassigned) | N | N | N | N | N |

### Toggle
Button group to switch between "By Owner" and "By Team" grouping.

---

## Report 4: Weekly Trend

**Purpose:** Show program velocity over time for steering committee reporting.

### Visualization
Line chart with 2 lines:
1. **Objects advanced** (moved to a later stage that week) — green line
2. **Issues opened** that week — amber line
3. **Issues closed** that week — blue line

X-axis: Weeks (Mon–Sun). Y-axis: Count. Show last 8–12 weeks based on date range.

### Data Source
- Objects advanced: Count of `stage_history` transitions where `to_stage > from_stage` per week
- Issues opened: Count of `issues` by `created_at` per week
- Issues closed: Count of `issues` where `status IN (resolved, closed)` by `resolved_at` per week

### Data Table

| Week | Objects Advanced | Issues Opened | Issues Closed | Net Issues |
|------|-----------------|---------------|---------------|------------|
| Feb 3–9 | N | N | N | +/-N |
| Feb 10–16 | N | N | N | +/-N |

---

## Implementation

### Chart Library
Use `recharts` for React-native charting. Lightweight, composable, works well with Tailwind.

```bash
npm install recharts
```

### Data Fetching
Reports use dedicated queries that aggregate data:

```typescript
// src/hooks/useReports.ts
export function useModuleReport(dateRange: string, module?: string)
export function usePipelineReport(dateRange: string, module?: string)
export function useWorkloadReport(dateRange: string, groupBy: 'owner' | 'team')
export function useWeeklyTrend(dateRange: string, module?: string)
```

All report hooks use React Query with a longer staleTime (5 minutes) since report data is less volatile.

### Computation
All aggregation is done client-side from the raw data (objects, issues, stage_history). No server-side aggregation needed for the current data scale (<100 objects).

If data grows significantly (>500 objects), consider Supabase database functions for aggregation.

### Export
Each report section has a small export icon that downloads that section as an Excel sheet. The main "Export" button exports all 4 reports into a single workbook with one sheet per report.

## Mobile Considerations
On mobile, report cards stack vertically. Charts are horizontally scrollable where needed. The controls bar collapses into a sticky header with filter toggles.

## Design Tokens
- Chart colors: Reuse status colors and stage gradient colors from `docs/design/CONTEXT.md`
- Chart background: `--color-bg-secondary`
- Grid lines: `--color-border` at 20% opacity
- Tooltip: `--color-bg-tertiary` with `--color-text-primary`
- Font for axis labels: `--font-data` (JetBrains Mono) at 10px
