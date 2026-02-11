# Feature: Issue Register

## Purpose
Track every blocker, question, dependency, and decision across the program. Issues are always linked to a data object and the lifecycle stage where they were raised.

## User Stories

1. **As the DNA Lead, I want to** log an issue against a specific object **so that** I know exactly what's blocking progress.
2. **As the DNA Lead, I want to** record the decision when an issue is resolved **so that** I never have to relitigate a closed decision.
3. **As the DNA Lead, I want to** see all open issues across the program **so that** I can prioritize my attention.
4. **As the DNA Lead, I want to** mark an issue as blocked by another object **so that** cross-dependencies are visible.

## Issue List View (Desktop)

A table with the following columns:

| Column | Source | Sortable | Filterable |
|--------|--------|----------|------------|
| Title | `issues.title` | Yes | Search |
| Object | `objects.name` (join) | Yes | Search/Dropdown |
| Module | `objects.module` (join) | Yes | Dropdown |
| Issue Type | `issues.issue_type` | Yes | Dropdown |
| Lifecycle Stage | `issues.lifecycle_stage` | Yes | Dropdown |
| Status | `issues.status` | Yes | Dropdown |
| Owner | `issues.owner_alias` | Yes | Search |
| Created | `issues.created_at` | Yes | Date range |
| Age | Computed (days since created) | Yes | - |

Default sort: Status (blocked first, then open, then in_progress), then created_at ascending (oldest first).

Default filter: `is_archived = false` AND `status NOT IN ('closed')`

### Visual Indicators
- **Status:** Color-coded badge (red = blocked, orange = open, blue = in_progress, green = resolved, grey = closed).
- **Issue Type:** Icon or small tag (wrench for technical, chain for dependency, checkmark for signoff, etc.).
- **Age:** Days since creation. Amber >5 days, red >10 days for open issues.

## Issue List View (Mobile)

Card layout. Each card shows:
- Issue title + status badge
- Parent object name
- Issue type tag
- Age in days
- Owner alias

## Issue Detail View

### Header
- Title, description
- Status badge + status change dropdown
- Issue type
- Parent object (clickable link to object detail)
- Lifecycle stage where raised
- Owner and raised-by

### Dependency Section
If `blocked_by_object_id` is set:
- Show the blocking object's name, current stage, and status
- Clickable link to that object

If `blocked_by_note` is set:
- Show the freetext note

### Decision Section
Visible when status is `resolved` or `closed`:
- Decision text (required when resolving)
- Resolved timestamp
- Who resolved it (captured as the authenticated user)

### Timeline (v2)
Chronological log of status changes. Not in v1 - keep it simple.

## Create Issue Form

Accessed from:
1. Issue list page (standalone)
2. Object detail page (pre-fills object and lifecycle stage)

Fields:
- Title (required, text input)
- Description (optional, textarea)
- Object (required, searchable dropdown of active objects)
- Lifecycle Stage (required, dropdown - auto-populated with the object's current stage, but editable)
- Issue Type (required, dropdown)
- Status (required, dropdown, default: open)
- Owner (optional, text input - masked alias)
- Raised By (optional, text input - masked alias, default: current user alias)
- Blocked By Object (optional, searchable dropdown of other objects)
- Blocked By Note (optional, text input)

## Resolve/Close Issue Flow

When changing status to `resolved`:
- A "Decision" textarea appears (required)
- `resolved_at` is auto-set to now
- The decision is immutable once saved (can be edited within 24 hours as a grace period, then locked)

When changing status to `closed`:
- If not already resolved, same decision capture applies
- Issue is hidden from default views
- After 30 days, eligible for archiving

## Issue-to-Object Feedback

When an object has any issues with status = `blocked`, the object's status should display a visual indicator (not auto-changed, but flagged). The DNA Lead manually decides if the object status should change to `blocked` or `at_risk`.

## Quick Actions

From the issue list, allow inline status changes without opening the detail view:
- Dropdown on the status badge to change status
- If changing to resolved, a modal prompts for the decision text
