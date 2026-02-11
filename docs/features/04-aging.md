# Feature: Aging

## Purpose
Surface objects that are silently stuck. If nobody has raised an issue but an object hasn't moved stages in two weeks, something is probably wrong. Aging is the early warning system.

## How It Works

### Object Aging
Computed client-side. Formula:

```
aging_days = floor((now - object.stage_entered_at) / (1 day))
```

`stage_entered_at` is automatically updated by the database trigger whenever `current_stage` changes.

### Issue Aging
Computed client-side. Formula:

```
issue_age_days = floor((now - issue.created_at) / (1 day))
```

For resolved/closed issues, age is frozen at resolution:

```
issue_age_days = floor((issue.resolved_at - issue.created_at) / (1 day))
```

## Visual Thresholds

### Object Aging
| Days | Color | Label |
|------|-------|-------|
| 0-7 | Green (default) | Normal |
| 8-14 | Amber | Attention |
| 15+ | Red | Overdue |

### Issue Aging
| Days | Color | Label |
|------|-------|-------|
| 0-3 | Green (default) | Fresh |
| 4-7 | Amber | Aging |
| 8+ | Red | Stale |

These thresholds are configurable as constants in the codebase. No need for a settings UI in v1.

```typescript
// src/lib/constants.ts
export const OBJECT_AGING_THRESHOLDS = {
  warning: 8,   // days
  critical: 15, // days
};

export const ISSUE_AGING_THRESHOLDS = {
  warning: 4,
  critical: 8,
};
```

## Display

### In List Views
Show aging as a number with a colored dot or background:
- "3d" (green)
- "12d" (amber)
- "23d" (red)

### In Detail Views
Show aging prominently in the header area. For objects, also show a breakdown of time spent at each stage from stage_history.

### In Summary Bar
Show average aging across all filtered objects. Highlight if the average exceeds the warning threshold.

## Aging Alerts (v2)

Not in v1, but the data model supports it: query all objects where `aging > threshold` and surface them in a dedicated "Needs Attention" view.
