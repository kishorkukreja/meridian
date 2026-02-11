# Feature: Object Lifecycle Tracker

## Purpose
The primary view of the program. Shows every data object being migrated and where it sits in its journey from requirements to go-live.

## User Stories

1. **As the DNA Lead, I want to** see all data objects in one place **so that** I know the overall state of the program at a glance.
2. **As the DNA Lead, I want to** see which lifecycle stage each object is in **so that** I can identify what's progressing and what's stuck.
3. **As the DNA Lead, I want to** advance an object to the next stage **so that** the tracker reflects actual progress.
4. **As the DNA Lead, I want to** add new objects as they come into scope **so that** nothing is missed.

## Object List View (Desktop)

A table with the following columns:

| Column | Source | Sortable | Filterable |
|--------|--------|----------|------------|
| Name | `objects.name` | Yes | Search |
| Module | `objects.module` | Yes | Dropdown |
| Category | `objects.category` | Yes | Dropdown |
| Region | `objects.region` | Yes | Dropdown |
| Source System | `objects.source_system` | Yes | Dropdown |
| Current Stage | `objects.current_stage` | Yes | Dropdown |
| Status | `objects.status` | Yes | Dropdown |
| Owner | `objects.owner_alias` | Yes | Search |
| Aging | Computed | Yes | Range |
| Open Issues | Computed (count) | Yes | - |

Default sort: Status (blocked first, then at_risk, then on_track), then aging descending.

Default filter: `is_archived = false`

### Visual Indicators
- **Stage:** Render as a mini progress bar or step indicator showing position in the 9-stage lifecycle.
- **Status:** Color-coded badge (green = on_track, amber = at_risk, red = blocked, grey = completed).
- **Aging:** Show in days. Highlight amber if >7 days, red if >14 days at same stage.
- **Open Issues:** Show count. Red badge if any issues are status = 'blocked'.

## Object List View (Mobile)

Card layout. Each card shows:
- Object name + status badge
- Module / Category tag
- Current stage as a compact step indicator
- Aging in days
- Open issue count

Cards are vertically scrollable. Tap to expand to detail view.

## Object Detail View

Accessed by clicking an object from the list.

### Header
- Object name, description
- Module, category, region, source system
- Owner and team
- Status badge
- Edit button (desktop only)

### Lifecycle Progress
A horizontal stepper showing all 9 stages. Current stage is highlighted. Completed stages are filled. Future stages are greyed out.

Each stage shows:
- Stage name
- Date entered (from stage_history)
- Days spent at that stage

**Advance Stage Button:** A prominent button to move the object to the next stage. Triggers a confirmation dialog. On confirm, updates `current_stage` and the trigger logs the transition.

**Regress Stage:** Allow moving backward (mistakes happen). Same confirmation flow.

### Linked Issues
Below the lifecycle, show a list of all issues linked to this object:
- Title, type, status, owner
- Lifecycle stage where it was raised
- Created date
- Quick-add issue button

### Stage History
Collapsible section showing the full audit trail of stage transitions with timestamps.

### Notes
Freetext notes field. Auto-saved on blur.

## Create/Edit Object Form

Fields:
- Name (required, text input, suggest format: "OBJ-[MODULE]-[CATEGORY]-[NNN]")
- Description (optional, textarea)
- Module (required, dropdown)
- Category (required, dropdown - options depend on selected module)
- Region (required, dropdown, default: region_eu)
- Source System (required, dropdown)
- Owner (optional, text input - masked alias)
- Team (optional, text input - masked alias)
- Initial Stage (required, dropdown, default: requirements)
- Status (required, dropdown, default: on_track)
- Notes (optional, textarea)

### Category-Module Dependency
When module = `demand_planning`, category options are: `master_data`, `drivers`
When module = `supply_planning`, category options are: `master_data`, `priority_1`, `priority_2`, `priority_3`

## Bulk Operations (v1 stretch)

- Select multiple objects → change status
- Select multiple objects → change owner

Not critical for v1 but useful if object count grows.
