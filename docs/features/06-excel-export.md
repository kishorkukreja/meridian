# Feature: Excel Export

## Purpose
Allow the DNA Lead to extract data from Meridian into Excel workbooks for offline analysis, stakeholder distribution, and integration with existing reporting workflows. Two modes: export what's on screen (filtered) or export everything (full dump).

## User Stories

1. **As the DNA Lead, I want to** export the current filtered view to Excel **so that** I can share a snapshot of specific objects or issues with stakeholders.
2. **As the DNA Lead, I want to** export all data as a multi-sheet workbook **so that** I have a complete offline backup for steering committee meetings.
3. **As the DNA Lead, I want to** export issues alongside their parent object names **so that** the Excel file is self-contained and readable without the app.

## Export Modes

### Filtered Export (Primary)
Exports exactly what the user sees on screen, respecting all active filters and sorting.

- **Trigger:** "Export" button in the page header (next to "+ New Object" / "+ New Issue")
- **Output:** Single-sheet `.xlsx` file
- **Filename:** `meridian-objects-{date}.xlsx` or `meridian-issues-{date}.xlsx`
- **Columns:** Match the table columns currently displayed
- **Row order:** Match the current sort order

### Full Export
Exports all data regardless of filters, organized into multiple sheets.

- **Trigger:** "Export All" option in a dropdown next to the export button
- **Output:** Multi-sheet `.xlsx` workbook
- **Filename:** `meridian-full-export-{date}.xlsx`

#### Sheets for Full Export

| Sheet Name | Contents |
|------------|----------|
| Objects - Demand Planning | All DP objects with computed fields |
| Objects - Supply Planning | All SP objects with computed fields |
| Issues - Open | All non-closed issues with parent object name |
| Issues - Resolved | All resolved/closed issues with decisions |
| Summary | Aggregate counts by module, stage, status |

## Column Mapping

### Objects Sheet

| Excel Column | Source | Format |
|-------------|--------|--------|
| Name | `objects.name` | Text (monospace) |
| Description | `objects.description` | Text |
| Module | `objects.module` | Label (e.g., "Demand Planning") |
| Category | `objects.category` | Label |
| Region | `objects.region` | Label |
| Source System | `objects.source_system` | Label |
| Current Stage | `objects.current_stage` | Label |
| Status | `objects.status` | Label |
| Owner | `objects.owner_alias` | Text |
| Team | `objects.team_alias` | Text |
| Aging (days) | Computed | Number |
| Open Issues | Computed | Number |
| Progress (%) | Computed | Percentage |
| Created | `objects.created_at` | Date |
| Last Updated | `objects.updated_at` | Date |

### Issues Sheet

| Excel Column | Source | Format |
|-------------|--------|--------|
| Title | `issues.title` | Text |
| Description | `issues.description` | Text |
| Parent Object | `objects.name` (joined) | Text |
| Module | `objects.module` (joined) | Label |
| Issue Type | `issues.issue_type` | Label |
| Lifecycle Stage | `issues.lifecycle_stage` | Label |
| Status | `issues.status` | Label |
| Owner | `issues.owner_alias` | Text |
| Raised By | `issues.raised_by_alias` | Text |
| Age (days) | Computed | Number |
| Decision | `issues.decision` | Text |
| Blocked By | `issues.blocked_by_note` | Text |
| Created | `issues.created_at` | Date |
| Resolved | `issues.resolved_at` | Date |

## Implementation

### Library
Use `xlsx` (SheetJS) for client-side Excel generation. No server-side processing needed.

```bash
npm install xlsx
```

### Architecture
- Client-side only — data is already loaded via React Query
- For filtered export: use the current query data in memory
- For full export: fire dedicated Supabase queries to fetch all data
- Generate workbook in-browser, trigger download via blob URL

### Component

```typescript
// src/lib/exportExcel.ts
export function exportObjectsToExcel(objects: ObjectWithComputed[], filename: string): void
export function exportIssuesToExcel(issues: IssueWithObject[], filename: string): void
export function exportFullWorkbook(): Promise<void>
```

### UI Placement
- Objects page: Export dropdown button in header row, right of "+ New Object"
- Issues page: Export dropdown button in header row, right of "+ New Issue"
- Dropdown options: "Export Current View" | "Export All Data"

## Styling
- Header row: Bold, light grey background
- Status columns: Use text labels (not color codes)
- Date columns: Formatted as `YYYY-MM-DD`
- Number columns: Right-aligned
- Column widths: Auto-fit to content

## Mobile Considerations
Export buttons are accessible on mobile but positioned in a secondary menu (overflow "..." button) to save header space.
