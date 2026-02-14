# Feature: Dashboard

## Purpose
A visual landing page that gives the DNA Lead an instant pulse check on the entire program without clicking into any list views. The dashboard consolidates KPIs, charts, pinned favorites, schedule information, and a recent activity feed into a single high-signal overview. Every section is interactive, navigating to the relevant filtered list view on click.

## User Stories

1. **As the DNA Lead, I want to** see overall program health in one glance **so that** I can decide where to focus my day.
2. **As the DNA Lead, I want to** see which stages are bottlenecked **so that** I can escalate blockers proactively.
3. **As the DNA Lead, I want to** pin important objects and issues **so that** I can access them instantly from the dashboard.
4. **As the DNA Lead, I want to** see my upcoming meetings this week **so that** I stay on top of the recurring schedule.
5. **As the DNA Lead, I want to** see recent activity **so that** I know what changed since my last login.
6. **As the DNA Lead, I want to** click through dashboard cards into filtered list views **so that** I can drill down quickly.

## Navigation

- Sidebar item: "Dashboard" (first item, above Objects)
- Route: `/dashboard`
- This is the default route (redirect `/` -> `/dashboard`)
- Icon: Grid/dashboard icon

## Dashboard Layout

### Row 1: KPI Cards (2-col mobile, 4-col tablet, 6-col desktop)

| Card | Value | Subtext | Click Action |
|------|-------|---------|--------------|
| Active Objects | Total count | - | Navigate to `/objects` |
| Open Issues | Count (non-closed, non-resolved) | "N blocked" if any | Navigate to `/issues?status=open,in_progress,blocked` |
| Blocked | Combined count (objects + issues) | "N obj, N iss" breakdown | Navigate to `/objects?status=blocked` |
| At Risk | Count of at-risk objects | Amber when > 0 | Navigate to `/objects?status=at_risk` |
| Avg Aging | Average days across all objects | - | Navigate to `/objects?sort=aging&order=desc` |
| Meetings This Week | Count of upcoming occurrences (next 7 days) | "N total recorded" | Navigate to `/schedule` |

Each card uses `--color-bg-secondary` background, large value in `--font-data`, and subtext in `--color-text-tertiary`. The value text color changes based on severity (red for blocked, amber for at risk).

### Pinned Items Section

Displays starred objects and issues for quick access. Items are pinned via the `PinButton` star component on object/issue detail pages.

- Shows pinned objects first, then pinned issues
- Each row: star toggle + name (truncated) + status badge
- Clicking a row navigates to the detail page (`/objects/:id` or `/issues/:id`)
- Empty state: "Star objects or issues to pin them here for quick access."
- Data source: `meridian_pins` table via `usePinnedObjects()` and `usePinnedIssues()` hooks

### Pipeline Funnel (full width)

A vertical bar chart showing object counts at each of the 9 lifecycle stages.

- One bar per stage, colored using stage gradient colors (`--stage-1` through `--stage-9`)
- X-axis: stage labels (angled for readability), Y-axis: object count
- Clicking a bar navigates to `/objects?current_stage={stage}`
- Header shows: completed/total live count and percentage
- Chart library: `recharts` `BarChart` with `Cell` per-bar coloring

### Row: Object Status + Issue Status (side by side)

#### Left: Object Status Donut
Donut chart showing object status breakdown.

- Segments: on_track (green), at_risk (amber), blocked (red), completed (grey)
- Zero-count segments are excluded
- Legend beside the chart with colored dots and counts
- Uses `recharts` `PieChart` with inner radius for donut effect

#### Right: Issue Status Donut
Donut chart showing issue status breakdown.

- Segments: open (blue), in_progress (amber), blocked (red), resolved (green), closed (grey)
- Same layout as object status donut
- Empty state: "No issues yet."

### Row: Module Comparison + Next Action Summary (side by side)

#### Left: Module Comparison
Progress bars comparing modules (Demand Planning, Supply Planning, and any additional modules).

Each module shows:
- Module label
- Stats line: "N obj, N issues, N%" (object count, open issue count, average progress)
- Horizontal progress bar filled to average completion percentage
- Blocked count highlighted in red below the bar (if any)

#### Right: Next Action Summary (Open Issues)
Shows counts of open issues grouped by their `next_action` field.

- One row per action type: Observe, Follow Up, Set Meeting
- Each row is a clickable button navigating to `/issues?next_action={action}`
- Color-coded badges per action type using `NEXT_ACTION_COLORS`
- Footer shows count of issues with no action set

### Row: Upcoming Schedule + Recent Meetings (side by side)

#### Left: Upcoming Schedule
Shows recurring meeting occurrences for the next 7 days.

- Each row: day label, time, meeting name, attendance status
- "Today" entries are visually highlighted with accent background
- Shows up to 8 entries with "+N more" link to `/schedule`
- Empty state: "No meetings scheduled this week."
- Data source: `useScheduleOccurrences()` hook

#### Right: Recent Meetings
Shows the 5 most recent recorded meetings.

- Each row: date, title, TLDR preview (truncated), action count badge
- "View all" link navigates to `/meetings`
- Clicking a row navigates to `/meetings/:id`
- Empty state: "No meetings recorded yet."

### Issue Type Breakdown (full width)

Horizontal bar chart showing open issue counts by issue type.

- One row per issue type with non-zero count: label, proportional bar, count
- Bar width is relative to the maximum count across types
- Clicking a row navigates to `/issues?issue_type={type}`
- Hidden entirely when no open issues exist

### Recent Activity Feed (full width)

A reverse-chronological list of the last 12 events across the system.

| Event Type | Icon | Color | Example |
|-----------|------|-------|---------|
| Object created | `+` | Blue | "Object created: OBJ-DP-MD-001" |
| Issue opened | `!` | Amber | "Issue opened: 'Format change' on OBJ-DP-DR-002" |
| Issue resolved | Checkmark | Green | "Issue resolved: 'Granularity mismatch'" |
| Meeting recorded | `M` | Accent | "Meeting recorded: 'Weekly S&OP Sync'" |

Events are derived from:
- `objects.created_at` for object creation
- `issues.created_at` for new issues
- `issues.resolved_at` for resolutions
- `meetings.created_at` for meeting recordings

Each event row: icon badge, date, message text. All events are clickable, navigating to the relevant detail page.

## Implementation

### Data Fetching

```typescript
// DashboardPage.tsx uses existing hooks in parallel
const { data: objects } = useObjects()
const { data: issues } = useIssues()
const { data: meetings } = useMeetings()
const { data: pinnedObjects } = usePinnedObjects()
const { data: pinnedIssues } = usePinnedIssues()
const { data: occurrences } = useScheduleOccurrences(rangeStart, rangeEnd)
```

All queries use React Query with default staleTime. Dashboard loads all data in parallel via multiple `useQuery` hooks. Loading skeleton is shown while any primary data (objects, issues, meetings) is pending.

### Components

The dashboard is composed of private child components within `DashboardPage.tsx`:

- `KpiCard` -- Reusable card with label, value, optional subtext and color
- `PinnedItems` -- Renders pinned objects and issues with star toggles
- `PipelineFunnel` -- Bar chart of objects by lifecycle stage
- `StatusDonut` -- Donut chart for object status distribution
- `IssueStatusDonut` -- Donut chart for issue status distribution
- `ModuleComparison` -- Progress bars per module
- `NextActionSummary` -- Action type counts for open issues
- `UpcomingSchedule` -- Next 7 days of recurring meeting occurrences
- `RecentMeetings` -- Last 5 recorded meetings
- `IssueTypeBreakdown` -- Horizontal bars by issue type
- `RecentActivity` -- Chronological event feed

### Chart Library

Uses `recharts` (shared with Reports feature):
- `PieChart` / `Pie` / `Cell` for donut charts
- `BarChart` / `Bar` / `XAxis` / `YAxis` / `Tooltip` / `ResponsiveContainer` for pipeline funnel

### Chart Colors

```typescript
const STATUS_CHART_COLORS = {
  on_track: '#10B981',
  at_risk: '#F59E0B',
  blocked: '#EF4444',
  completed: '#6B7280',
  archived: '#4B5563',
}

const STAGE_CHART_COLORS = {
  requirements: '#6366F1', mapping: '#818CF8', extraction: '#3B82F6',
  ingestion: '#06B6D4', transformation: '#14B8A6', push_to_target: '#10B981',
  validation: '#22C55E', signoff: '#84CC16', live: '#EAB308',
}

const ISSUE_STATUS_COLORS = {
  open: '#3B82F6', in_progress: '#F59E0B', blocked: '#EF4444',
  resolved: '#10B981', closed: '#6B7280',
}
```

## Mobile Layout

- KPI cards: 2-column grid
- Pinned items: Full width, scrollable
- Pipeline funnel: Full width, horizontally scrollable if needed
- Status / Module / Schedule cards: Stack vertically (single column)
- Activity feed: Full width, last 12 items
- Max width constrained to `max-w-6xl` on desktop

## Design Notes

- KPI cards: `--color-bg-secondary` with 1px border, value in `--font-data` at `text-2xl`
- All section cards: Rounded-lg with `--color-bg-secondary` background and `--color-border` border
- Empty states use `--color-text-tertiary` centered text
- Tooltip styling: `--color-bg-tertiary` background, `--color-border` border, 12px font
- Activity feed icons: 20x20 rounded circles with 20% opacity background tints
