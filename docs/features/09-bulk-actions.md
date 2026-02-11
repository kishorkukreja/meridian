# Feature: Bulk Actions

## Purpose
Allow the DNA Lead to perform batch operations on multiple objects or issues at once, reducing repetitive clicking when managing the program at scale (e.g., marking 5 objects as blocked during a steering committee call).

## User Stories

1. **As the DNA Lead, I want to** select multiple objects and change their status in one action **so that** I can update the program state quickly during meetings.
2. **As the DNA Lead, I want to** select multiple objects and reassign them to a new owner **so that** handovers are efficient.
3. **As the DNA Lead, I want to** archive multiple completed objects at once **so that** I can clean up the active view.
4. **As the DNA Lead, I want to** select multiple issues and change their status **so that** I can batch-resolve related issues.

## Selection Model

### Activating Selection Mode
- **Desktop:** A checkbox column appears as the first column in the table. Clicking any checkbox enters selection mode.
- **Mobile:** Long-press on a card enters selection mode. Subsequent taps toggle selection.

### Selection Controls
When 1+ items are selected, a floating action bar appears at the bottom of the viewport:

```
┌──────────────────────────────────────────────────────────┐
│  ☑ 3 selected    [Change Status ▾]  [Change Owner]  [Archive]  [✕ Cancel]  │
└──────────────────────────────────────────────────────────┘
```

### Select All
- Checkbox in the table header selects/deselects all visible rows
- "Select all N results" link appears if there are more items than visible (for paginated future)
- Selection is limited to the current filtered view

## Available Bulk Actions

### Objects

| Action | Behavior | Confirmation |
|--------|----------|-------------|
| Change Status | Dropdown: on_track, at_risk, blocked, completed | "Change N objects to {status}?" |
| Change Owner | Text input for new owner alias | "Reassign N objects to {alias}?" |
| Archive | Soft archive (set is_archived = true) | "Archive N objects? They can be restored later." |

### Issues

| Action | Behavior | Confirmation |
|--------|----------|-------------|
| Change Status | Dropdown: open, in_progress, blocked, resolved, closed | See special handling below |
| Change Owner | Text input for new owner alias | "Reassign N issues to {alias}?" |
| Archive | Soft archive | "Archive N issues?" |

### Special: Bulk Resolve/Close Issues
When bulk-changing issues to `resolved` or `closed`, a decision is still required:
- Modal appears: "Record a decision for N issues"
- Single decision text applies to all selected issues
- Each issue gets the same decision text and resolved_at timestamp

## Implementation

### State Management
Selection state is local React state in the list page component:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const isSelectionActive = selectedIds.size > 0
```

### Bulk Mutation

```typescript
// src/hooks/useObjects.ts
export function useBulkUpdateObjects()
// Accepts: { ids: string[], updates: Partial<ObjectRow> }
// Calls supabase.from('meridian_objects').update(updates).in('id', ids)

// src/hooks/useIssues.ts
export function useBulkUpdateIssues()
// Same pattern for issues
```

### UI Components

```typescript
// src/components/BulkActionBar.tsx
interface Props {
  type: 'objects' | 'issues'
  selectedCount: number
  onAction: (action: BulkAction) => void
  onCancel: () => void
}
```

### Query Invalidation
After any bulk action, invalidate the relevant query keys:
- `['objects']` for object bulk actions
- `['issues']` for issue bulk actions
- Individual `['object', id]` and `['issue', id]` for each affected item

## Keyboard Support
- `Escape`: Cancel selection
- `Ctrl/Cmd + A`: Select all visible (when selection mode is active)

## Mobile Considerations
- Floating action bar is fixed to bottom, above the navigation tabs
- Actions collapse into an overflow menu if space is tight
- Selection count badge shows in the header

## Edge Cases
- If a filter changes while items are selected, clear the selection
- If a selected item is updated by another action (e.g., status change via inline select), remove it from selection
- Maximum selection: No hard limit, but warn if >50 items selected ("This will update 50+ items. Are you sure?")
