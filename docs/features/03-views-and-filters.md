# Feature: Views and Filters

## Purpose
Enable the DNA Lead to slice the data in any direction without building custom reports. Views are URL-driven, meaning they're bookmarkable and shareable.

## Filter Architecture

All filters are stored as URL query parameters. The app reads filters from the URL on load and applies them to Supabase queries.

```
/objects?module=demand_planning&status=blocked&source_system=erp_primary
/issues?issue_type=dependency&status=open&module=supply_planning
```

### Filter Components
Each filterable column gets a filter control in a filter bar above the table:
- **Dropdowns:** For enum fields (module, category, status, issue_type, lifecycle_stage, source_system, region)
- **Search inputs:** For text fields (name, owner, title)
- **Date range picker:** For created_at, resolved_at
- **Range slider:** For aging (min/max days)

### Filter Bar Behavior
- Filters are additive (AND logic)
- Active filters show as chips/tags that can be individually removed
- "Clear all filters" button
- Filter state persists in URL (survives refresh, back/forward)

## Pre-Built Views

Save common filter combinations as named views accessible from the sidebar or a dropdown.

### Objects Views

| View Name | Filters | Purpose |
|-----------|---------|---------|
| All Active | `is_archived=false` | Default view |
| Blocked | `status=blocked` | What needs immediate attention |
| At Risk | `status=at_risk` | What might become blocked |
| Demand Planning | `module=demand_planning` | DP-specific view |
| Supply Planning | `module=supply_planning` | SP-specific view |
| Stale (>14 days) | `aging>=14` | Objects that haven't moved |
| Near Completion | `current_stage IN (validation, signoff)` | Almost done |

### Issues Views

| View Name | Filters | Purpose |
|-----------|---------|---------|
| All Open | `status IN (open, in_progress, blocked)` | Default view |
| Blocked | `status=blocked` | Critical blockers |
| Dependencies | `issue_type=dependency` | Cross-object dependencies |
| Awaiting Signoff | `issue_type=signoff` | Business sign-off queue |
| Recently Resolved | `status=resolved, last 7 days` | Recent decisions |

### Implementation
Pre-built views are stored as a static config in the frontend (no database table needed for v1). Each view is a named set of URL params.

```typescript
const SAVED_VIEWS = {
  objects: {
    blocked: { status: 'blocked', is_archived: 'false' },
    at_risk: { status: 'at_risk', is_archived: 'false' },
    demand_planning: { module: 'demand_planning', is_archived: 'false' },
    // ...
  },
  issues: {
    all_open: { status: 'open,in_progress,blocked', is_archived: 'false' },
    blocked: { status: 'blocked', is_archived: 'false' },
    // ...
  }
};
```

## Sorting

All sortable columns support ascending/descending toggle. Sort state is also in the URL:

```
/objects?sort=aging&order=desc
```

Multi-column sort is not needed for v1. Single sort column with direction is sufficient.

## Summary Bar

Above the table, show aggregate counts:

**Objects page:**
- Total active objects: N
- On track: N | At risk: N | Blocked: N | Completed: N
- Avg aging: N days

**Issues page:**
- Total open issues: N
- Open: N | In progress: N | Blocked: N
- Oldest open: N days

These counts respect the current filters. So if you filter by demand_planning, the counts reflect only DP objects.

## Mobile Considerations

On mobile, the full filter bar collapses into a "Filters" button that opens a bottom sheet with all filter options. Active filter count shows as a badge on the button.

Pre-built views appear as horizontal scrollable chips at the top of the list.
