# Design Context

## Design Philosophy

This is a **work tool**, not a portfolio piece. The design should feel like a precision instrument: clean, fast, zero visual noise, information-dense where needed, spacious where it helps comprehension.

**Aesthetic direction:** Industrial-utilitarian with warm accents. Think: a well-organized control room, not a SaaS marketing page.

## Visual Language

### Color System

```css
:root {
  /* Base */
  --bg-primary: #0F1117;          /* Deep dark blue-grey */
  --bg-secondary: #1A1D27;        /* Card/panel background */
  --bg-tertiary: #242836;         /* Elevated surfaces */
  --border: #2E3348;              /* Subtle borders */
  
  /* Text */
  --text-primary: #E8E9ED;        /* Primary text */
  --text-secondary: #9498A8;      /* Secondary/muted text */
  --text-tertiary: #5C6178;       /* Disabled/placeholder */
  
  /* Status Colors */
  --status-green: #34D399;        /* On track, resolved */
  --status-amber: #FBBF24;        /* At risk, warning */
  --status-red: #F87171;          /* Blocked, critical */
  --status-blue: #60A5FA;         /* In progress */
  --status-grey: #6B7280;         /* Completed, closed, archived */
  
  /* Accent */
  --accent-primary: #818CF8;      /* Interactive elements, links */
  --accent-hover: #A5B4FC;        /* Hover states */
  
  /* Lifecycle Stage Colors (gradient from start to end) */
  --stage-1: #6366F1;             /* Requirements */
  --stage-2: #818CF8;             /* Mapping */
  --stage-3: #60A5FA;             /* Extraction */
  --stage-4: #38BDF8;             /* Ingestion */
  --stage-5: #22D3EE;             /* Transformation */
  --stage-6: #2DD4BF;             /* Push to Target */
  --stage-7: #34D399;             /* Validation */
  --stage-8: #4ADE80;             /* Sign-off */
  --stage-9: #A3E635;             /* Live */
}
```

### Typography

Use **JetBrains Mono** for data-heavy elements (tables, codes, IDs) and a clean sans-serif like **DM Sans** for UI text and headings. The monospaced font reinforces the "control room" feel for data while keeping navigation and labels readable.

```css
--font-display: 'DM Sans', sans-serif;
--font-data: 'JetBrains Mono', monospace;
```

### Spacing and Density

- Tables should be **compact but readable**. Row height ~40px with 12px horizontal padding.
- Cards on mobile: 12px gap between cards, 16px internal padding.
- Use 4px/8px/12px/16px/24px/32px spacing scale (Tailwind default).
- No excessive whitespace. This is a dense information tool.

### Borders and Elevation

- Minimal use of shadows. Prefer subtle 1px borders for separation.
- Cards use `border: 1px solid var(--border)` with no shadow.
- Modals and dropdowns get a slight shadow for overlay context.

## Component Patterns

### Tables (Desktop)
- Sticky header row
- Alternating row backgrounds (subtle: --bg-secondary / --bg-primary)
- Hover highlight on rows
- Click row to navigate to detail view
- Inline status badge changes (dropdown on click)

### Cards (Mobile)
- Full-width cards with rounded corners (8px)
- Status badge in top-right corner
- Key info in 2-column grid within the card
- Tap to expand or navigate

### Status Badges
Pill-shaped, small, color-coded:
```
[● On Track]  [● Blocked]  [● At Risk]  [● Completed]
```
Dot + text, background uses status color at 15% opacity, text uses status color at full.

### Lifecycle Stepper
Horizontal connected dots/circles for desktop. Each dot is color-coded per the stage color. Current stage is larger/pulsing. Completed stages are filled. Future stages are outlined.

On mobile: condensed to a single-line progress bar with stage number indicator.

### Forms
- Dark input fields with --bg-tertiary background
- Floating labels
- Inline validation (red border + message below field)
- Submit button uses --accent-primary
- Cancel is a text button, not a styled button

### Empty States
When a list has no results:
- Show a simple illustration or icon
- Contextual message: "No blocked objects. Everything is moving." vs. "No issues found for this filter."
- Action prompt if relevant: "Create your first object"

### Loading States
- Skeleton loaders for tables and cards (not spinners)
- Subtle shimmer animation on skeleton elements

## Navigation

### Desktop Sidebar
- Fixed left sidebar, ~220px wide
- Sections: Objects, Issues, Archive
- Pre-built views as sub-items under each section
- Collapse to icon-only mode (60px) for more table space

### Mobile Bottom Tabs
- 3 tabs: Objects, Issues, Archive
- Active tab highlighted with accent color
- No labels on icons when screen is very small (<360px)

## Responsive Breakpoints
```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

## Animations

Minimal. Only:
- Page transitions: subtle fade (150ms)
- Status badge changes: color transition (200ms)
- Lifecycle stepper advancement: fill animation (300ms)
- Skeleton shimmer: continuous subtle pulse
- Modal open/close: slide up from bottom on mobile, fade on desktop

No bouncing, no spring physics, no decorative animations. This is a work tool.

## Accessibility

- All interactive elements keyboard accessible
- Focus rings visible (2px solid --accent-primary)
- Color is never the only indicator (always paired with text or icon)
- Minimum contrast ratio 4.5:1 for text
- ARIA labels on icon-only buttons
