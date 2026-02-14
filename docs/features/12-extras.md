# Feature: Additional Features

## Purpose
Documents supplementary features that enhance the core Meridian experience: theming, pinned favorites, bulk CSV import, global search, comments with email polish, API tokens for external access, and bulk actions on list pages.

---

## Dark/Light Mode

### Purpose
Allow the DNA Lead to switch between dark and light themes based on personal preference or ambient lighting conditions.

### User Stories

1. **As the DNA Lead, I want to** toggle between dark and light mode **so that** I can use the tool comfortably in different environments.
2. **As the DNA Lead, I want to** have my theme preference persist across sessions **so that** I do not need to re-select it each time.

### Implementation

#### ThemeContext

```typescript
// src/lib/ThemeContext.tsx
const ThemeContext = createContext<{ theme: 'dark' | 'light'; toggleTheme: () => void }>()
```

- Theme state is stored in `localStorage` under a `meridian_theme` key
- On load, reads from localStorage (defaults to `dark` if not set)
- `toggleTheme()` flips between `dark` and `light`, updates localStorage, and applies the class to the `<html>` element

#### CSS Custom Properties

The dark theme uses the base `:root` variables defined in `docs/design/CONTEXT.md`. The light theme overrides these via `html.light`:

```css
html.light {
  --color-bg-primary: #F8F9FA;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary: #F0F1F3;
  --color-border: #E2E4E9;
  --color-text-primary: #1A1D27;
  --color-text-secondary: #5C6178;
  --color-text-tertiary: #9498A8;
  /* Status and accent colors remain unchanged */
}
```

#### Toggle Button

Located in the sidebar footer (desktop) and settings area (mobile):
- Sun icon for light mode, Moon icon for dark mode
- Accessible via the `Layout` component which imports `useTheme()` from ThemeContext
- `toggleTheme` is called on click

---

## Pinned Favorites

### Purpose
Let the DNA Lead star important objects and issues for quick access from the dashboard. Pinned items appear in a dedicated section on the dashboard page.

### User Stories

1. **As the DNA Lead, I want to** star an object or issue from its detail page **so that** it appears on my dashboard for quick access.
2. **As the DNA Lead, I want to** unstar an item **so that** my pinned section stays relevant.

### Database Schema

```sql
CREATE TABLE meridian_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('object', 'issue')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);
```

Migration: `011_pins.sql`

### Types

```typescript
export type PinRow = {
  id: string
  user_id: string
  entity_type: 'object' | 'issue'
  entity_id: string
  created_at: string
}
```

### UI: PinButton Component

```typescript
// src/components/PinButton.tsx
interface Props {
  entityType: 'object' | 'issue'
  entityId: string
}
```

- Renders a star icon (filled when pinned, outlined when not)
- Clicking toggles the pin state via `useTogglePin()` mutation
- Appears on `ObjectDetailPage` and `IssueDetailPage` headers
- Also appears inline on the dashboard Pinned Items section

### Hooks

```typescript
// src/hooks/usePins.ts
export function usePins()                                          // All pins for current user
export function useIsPinned(entityType, entityId)                  // Boolean check
export function useTogglePin()                                     // Toggle mutation (insert/delete)
export function usePinnedObjects()                                 // Resolved objects with computed fields
export function usePinnedIssues()                                  // Resolved issues with object names
```

### Dashboard Integration

The Pinned Items section on the dashboard (see `docs/features/08-dashboard.md`) shows all pinned objects and issues with:
- Star toggle for quick unpin
- Object/issue name (truncated)
- Status badge
- Click to navigate to detail page
- Empty state when nothing is pinned

---

## Bulk CSV Import

### Purpose
Allow the DNA Lead to import objects and issues in bulk from CSV files, avoiding manual data entry when onboarding existing tracker data or adding large batches of items.

### User Stories

1. **As the DNA Lead, I want to** import objects from a CSV file **so that** I can onboard existing tracker data without entering each item manually.
2. **As the DNA Lead, I want to** preview and validate imported data before committing **so that** I can catch errors before they enter the system.
3. **As the DNA Lead, I want to** download a CSV template **so that** I know the exact format required for import.

### Navigation

- Route: `/import`
- Accessible from sidebar or settings area

### UI Flow

#### Step 1: Select Tab
Two tabs at the top: **Objects** and **Issues**. Switching tabs resets the import state.

#### Step 2: Upload
Drag-and-drop zone or click-to-browse for `.csv` files. Template download link is available above the drop zone.

#### Step 3: Validate & Preview
After file upload, client-side CSV parsing runs via `parseCSV()` and `validateObjectRows()` / `validateIssueRows()` from `src/lib/csvParser.ts`:

- **Valid rows**: Shown in a preview table (first 50 rows displayed)
- **Validation errors**: Listed with row number and error message in a red-tinted panel
- Summary: "N valid rows, N errors"

#### Step 4: Import
"Import N objects/issues" button triggers batch inserts:
- Rows are inserted in chunks of 50
- Progress bar shows current/total count
- Object import: Direct insert to `meridian_objects`
- Issue import: Matches `object_name` column against existing object names to resolve `object_id`. Unmatched rows are reported as errors.

#### Step 5: Done
Success message with count of imported items. Error details shown for any failed batches. "Import More" button resets to the upload state.

### CSV Templates

Downloadable via `generateObjectTemplate()` and `generateIssueTemplate()`:

**Objects template columns:**
- `name` (required), `module` (required), `status` (required), `lifecycle_stage`, `owner_alias`, `description`, `category`, `region`, `source_system`

**Issues template columns:**
- `title` (required), `object_name` (required), `issue_type` (required), `lifecycle_stage` (required), `status` (required), `next_action`, `owner_alias`, `description`

### Implementation

```typescript
// src/lib/csvParser.ts
export function parseCSV(text: string): { rows: Record<string, string>[] }
export function validateObjectRows(rows): { valid: ValidObjectRow[]; errors: { row: number; message: string }[] }
export function validateIssueRows(rows): { valid: ValidIssueRow[]; errors: { row: number; message: string }[] }
export function generateObjectTemplate(): string
export function generateIssueTemplate(): string
```

Page component: `src/pages/ImportPage.tsx`

---

## Global Search

### Purpose
Provide a unified search interface that queries across all entity types (objects, issues, meetings, comments) from a single input, enabling fast navigation to any item in the system.

### User Stories

1. **As the DNA Lead, I want to** search for any item by name or content **so that** I can navigate directly without browsing through lists.
2. **As the DNA Lead, I want to** see categorized results **so that** I can distinguish between objects, issues, meetings, and comments.

### UI: GlobalSearch Component

```typescript
// src/components/GlobalSearch.tsx
```

Located in the sidebar below the app header. Renders a search input with a magnifying glass icon.

### Behavior

1. **Debounced input**: 300ms debounce before executing queries
2. **Parallel queries**: Searches across 4 tables simultaneously using `Promise.all`:
   - `meridian_objects`: matches `name` via `ilike`, returns up to 5 results
   - `meridian_issues`: matches `title` via `ilike`, returns up to 5 results
   - `meridian_meetings`: matches `title` via `ilike`, returns up to 5 results
   - `meridian_comments`: matches `body` via `ilike`, returns up to 5 results
3. **Categorized dropdown**: Results grouped by type, each with a type icon and label:
   - Objects: square icon, blue
   - Issues: exclamation icon, amber
   - Meetings: M icon, accent
   - Comments: hash icon, grey
4. **Click to navigate**: Selecting a result navigates to the relevant detail page and clears the search
5. **Click outside to close**: Dropdown closes when clicking outside the search container
6. **Loading state**: Shows "Searching..." while queries are in flight
7. **Empty state**: Shows "No results found" when queries return nothing

### Result Shape

```typescript
interface SearchResult {
  type: 'object' | 'issue' | 'meeting' | 'comment'
  id: string
  title: string
  subtitle?: string   // module, issue_type, date, or entity_type
  link: string        // navigation path
}
```

---

## Comments

### Purpose
Enable timestamped, threaded comments on objects and issues. Replaces the single freetext "notes" field with a conversation trail that preserves authorship and chronology. Includes an AI-powered email polish feature to turn comments into professional email drafts.

### User Stories

1. **As the DNA Lead, I want to** add a comment to an object or issue **so that** I can record context without editing the main description.
2. **As the DNA Lead, I want to** see a chronological thread of comments **so that** I can follow the investigation history.
3. **As the DNA Lead, I want to** turn a comment into a professional email draft **so that** I can communicate with stakeholders directly from the tracker.

### Database Schema

```sql
CREATE TABLE meridian_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('object', 'issue')),
  entity_id UUID NOT NULL,
  body TEXT NOT NULL,
  author_alias TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

Migration: `002_comments.sql`

### UI: CommentSection Component

```typescript
// src/components/CommentSection.tsx
interface Props {
  entityType: 'object' | 'issue'
  entityId: string
}
```

Placement: Bottom of `ObjectDetailPage` and `IssueDetailPage`.

- Header: "Comments (N)" with count
- Comments displayed in reverse chronological order (newest first)
- Each comment: author alias (monospace), relative timestamp, body text (preserves newlines)
- Input: Text field with "Add a comment..." placeholder, submit via arrow button or Enter key (Shift+Enter for newlines)
- Author alias: Stored in `localStorage` as `meridian_author_alias`. Prompted on first comment if not set.

### Email Polish

On issue comments, a "Polish to Email" action triggers the `polish-email` Supabase edge function via `usePolishEmail()`:

- Input: Comment text + issue context (title, object name, type, stage, status, owner, author)
- Output: Professional email with subject line and body
- Displayed in a modal or inline preview for copy/paste

### Hooks

```typescript
// src/hooks/useComments.ts
export function useComments(entityType, entityId)        // Fetch comments for an entity
export function useCreateComment()                       // Insert mutation
export function usePolishEmail()                         // Edge function for email drafts
```

### Comment Count

Shown in the section header ("Comments (3)") and optionally as a speech bubble icon with count in list views.

---

## API Tokens

### Purpose
Enable programmatic access to the Meridian issue tracker from CI pipelines, scripts, and automation tools. Tokens use scoped permissions and are stored as SHA-256 hashes for security.

### User Stories

1. **As the DNA Lead, I want to** create API tokens with specific scopes **so that** I can grant limited external access to the issue tracker.
2. **As the DNA Lead, I want to** revoke or delete tokens **so that** I can control access when needs change.

### Navigation

- Route: `/settings/api`
- Accessible from sidebar Settings section

### Token Management Page

Route: `/settings/api` (component: `src/pages/ApiTokensPage.tsx`)

#### Create Token
- Name input (descriptive label)
- Scope checkboxes: `issues:read`, `issues:write`
- Optional expiry date
- On creation: plaintext token shown once in a copy-able field (`mrd_` prefix + 40 hex chars)
- Warning: "This token will only be shown once. Copy it now."

#### Token List
Table of existing tokens:
- Name, token prefix (e.g., `mrd_ab12...`), scopes, created date, last used date, status
- Actions: Revoke (disables without deleting), Delete (permanent removal)
- Revoked tokens shown with strikethrough styling

### Database Schema

```sql
CREATE TABLE meridian_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,           -- SHA-256 hash of the full token
  token_prefix TEXT NOT NULL,                -- first 8 chars for display (e.g., "mrd_ab12...")
  scopes TEXT[] NOT NULL DEFAULT '{}',       -- e.g., {'issues:read', 'issues:write'}
  expires_at TIMESTAMPTZ,                    -- NULL = never expires
  revoked_at TIMESTAMPTZ,                    -- NULL = active
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Migration: `006_api_tokens.sql`

### Token Format
- Prefix: `mrd_`
- Entropy: 40 hex characters (160-bit)
- Only the SHA-256 hash is stored in the database
- The `token_prefix` (first 8-12 chars) is stored for identification in the UI

### Hooks

```typescript
// src/hooks/useApiTokens.ts
export function useApiTokens()          // List user's tokens
export function useCreateApiToken()     // Create with hash + return plaintext
export function useRevokeApiToken()     // Set revoked_at
export function useDeleteApiToken()     // Permanent deletion
```

### Security

- Plaintext token is never stored; only the SHA-256 hash is persisted
- HTTPS enforced by Supabase infrastructure
- Every database query is scoped to the token creator's `user_id` via RLS
- Scopes are checked before every API operation in the edge function
- See `docs/features/11-external-api.md` for the full API documentation

---

## Bulk Actions

### Purpose
Allow the DNA Lead to perform batch operations on multiple objects or issues at once, reducing repetitive clicking when managing the program at scale.

### User Stories

1. **As the DNA Lead, I want to** select multiple objects and change their status in one action **so that** I can update the program state quickly during meetings.
2. **As the DNA Lead, I want to** select multiple items and reassign them to a new owner **so that** handovers are efficient.

### Selection Model

#### Desktop
A checkbox column appears as the first column in the table. Clicking any checkbox enters selection mode.

#### Mobile
Long-press on a card enters selection mode. Subsequent taps toggle selection.

### Bulk Action Bar

When 1+ items are selected, a floating action bar appears at the bottom of the viewport:

```
[ N selected ]  [Change Status]  [Change Owner]  [Archive]  [Cancel]
```

Component: `src/components/BulkActionBar.tsx`

```typescript
interface Props {
  type: 'objects' | 'issues'
  selectedCount: number
  onAction: (action: BulkAction) => void
  onCancel: () => void
}
```

### Available Actions

#### Objects

| Action | Behavior | Confirmation |
|--------|----------|-------------|
| Change Status | Dropdown: on_track, at_risk, blocked, completed | "Change N objects to {status}?" |
| Change Owner | Text input for new owner alias | "Reassign N objects to {alias}?" |
| Archive | Soft archive (`is_archived = true`) | "Archive N objects? They can be restored later." |

#### Issues

| Action | Behavior | Confirmation |
|--------|----------|-------------|
| Change Status | Dropdown: open, in_progress, blocked, resolved, closed | See special handling below |
| Change Owner | Text input for new owner alias | "Reassign N issues to {alias}?" |
| Archive | Soft archive | "Archive N issues?" |

#### Special: Bulk Resolve/Close Issues
When bulk-changing issues to `resolved` or `closed`, a decision is still required:
- Modal appears: "Record a decision for N issues"
- Single decision text applies to all selected issues
- Each issue gets the same decision text and `resolved_at` timestamp

### Implementation

Selection state is local React state:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const isSelectionActive = selectedIds.size > 0
```

Bulk mutations call Supabase with `.update(updates).in('id', ids)` and invalidate relevant query keys on success.

### Keyboard Support

- `Escape`: Cancel selection
- `Ctrl/Cmd + A`: Select all visible (when selection mode is active)

### Edge Cases

- Filter changes clear the selection
- Maximum selection: No hard limit, but warn if >50 items selected
- Selection is limited to the current filtered view
