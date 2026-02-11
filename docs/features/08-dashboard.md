# Feature: Dashboard / Analytics

## Purpose
A visual landing page that gives the DNA Lead an instant pulse check on the entire program without clicking into any list views. Replaces the current default redirect to `/objects` with a high-signal overview.

## User Stories

1. **As the DNA Lead, I want to** see overall program health in one glance **so that** I can decide where to focus my day.
2. **As the DNA Lead, I want to** see which stages are bottlenecked **so that** I can escalate blockers proactively.
3. **As the DNA Lead, I want to** see recent activity **so that** I know what changed since my last login.
4. **As the DNA Lead, I want to** click through dashboard cards into filtered list views **so that** I can drill down quickly.

## Navigation

- New sidebar item: "Dashboard" (first item, above Objects)
- Route: `/dashboard`
- This becomes the default route (redirect `/` → `/dashboard`)
- Icon: Grid/dashboard icon

## Dashboard Layout

### Row 1: KPI Cards (4 across on desktop, 2x2 on mobile)

| Card | Value | Subtext | Click Action |
|------|-------|---------|-------------|
| Total Active Objects | Count | "+N this week" or "No change" | Navigate to `/objects` |
| Blocked Items | Count (objects + issues) | "N objects, N issues" | Navigate to `/objects?status=blocked` |
| Avg Stage Aging | N days | "↑2d vs last week" or "↓1d vs last week" | Navigate to `/objects?sort=aging&order=desc` |
| Open Issues | Count | "N critical (blocked)" | Navigate to `/issues?status=open,in_progress,blocked` |

### Row 2: Pipeline Funnel (full width)

A horizontal funnel showing the 9 lifecycle stages with object counts at each stage.

- Each stage is a trapezoid/block sized proportionally to its count
- Colored using stage gradient colors
- Clicking a stage navigates to `/objects?current_stage={stage}`
- Below funnel: total active objects and completion percentage

### Row 3: Two cards side by side

#### Left: Status Distribution
Donut chart showing object status breakdown (on_track / at_risk / blocked / completed). Center shows total count. Legend below with counts.

#### Right: Module Comparison
Two mini progress bars (Demand Planning / Supply Planning). Each shows:
- Object count
- Average progress percentage
- Blocked count highlighted in red

### Row 4: Recent Activity Feed

A chronological list of the last 10 events across the system:

| Event Type | Example |
|-----------|---------|
| Stage advance | "OBJ-DP-MD-001 advanced to Validation" |
| Status change | "OBJ-SP-P1-001 marked as Blocked" |
| Issue opened | "New issue on OBJ-DP-DR-002: Format change" |
| Issue resolved | "Issue resolved on OBJ-DP-MD-001: Granularity mismatch" |

Events are derived from:
- `stage_history` for stage transitions
- `objects.updated_at` + status for status changes
- `issues.created_at` for new issues
- `issues.resolved_at` for resolutions

Each event is clickable, navigating to the relevant object or issue.

## Implementation

### Data Fetching

```typescript
// src/hooks/useDashboard.ts
export function useDashboardStats()
// Returns: { totalObjects, blockedCount, avgAging, openIssues, weekDelta }

export function usePipelineFunnel()
// Returns: { stage: LifecycleStage, count: number }[]

export function useStatusDistribution()
// Returns: { status: ObjectStatus, count: number }[]

export function useModuleComparison()
// Returns: { module: ModuleType, count: number, avgProgress: number, blockedCount: number }[]

export function useRecentActivity(limit: number)
// Returns: { type: string, message: string, timestamp: string, link: string }[]
```

### Chart Library
Reuse `recharts` (installed for Reports feature). Components needed:
- `PieChart` for status donut
- Custom SVG for pipeline funnel (or horizontal `BarChart`)

### Performance
- All queries use React Query with 2-minute staleTime
- Dashboard loads all data in parallel (multiple useQuery hooks)
- KPI cards show loading skeletons while data arrives

## Mobile Layout
- KPI cards: 2x2 grid
- Pipeline funnel: Horizontal scrollable
- Status / Module cards: Stack vertically
- Activity feed: Full width, last 5 items with "See more" link

## Design Notes
- KPI cards: `--color-bg-secondary` background, large number in `--font-data`, subtext in `--color-text-tertiary`
- Funnel: Stage colors from `--color-stage-1` through `--color-stage-9`
- Donut: Status colors from `STATUS_COLORS`
- Activity feed: Compact rows, timestamp in `--color-text-tertiary`, event type icon colored by category
