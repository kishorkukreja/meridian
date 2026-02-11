# Feature: Comments Thread

## Purpose
Enable lightweight collaboration on objects and issues by allowing timestamped comments. Replaces the single freetext "notes" field with a threaded conversation that preserves who said what and when.

## User Stories

1. **As the DNA Lead, I want to** add a comment to an object **so that** I can record context about why something is stuck without editing the main description.
2. **As the DNA Lead, I want to** see a chronological thread of comments on an issue **so that** I can follow the investigation history.
3. **As the DNA Lead, I want to** know when a comment was added and by which alias **so that** I can track accountability.
4. **As the DNA Lead, I want to** comment directly from the object/issue detail page **so that** I don't need a separate communication channel.

## Database Schema

### New Table: `meridian_comments`

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

CREATE INDEX idx_meridian_comments_entity
  ON meridian_comments(entity_type, entity_id);

CREATE INDEX idx_meridian_comments_created
  ON meridian_comments(created_at);

ALTER TABLE meridian_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meridian_comments_user_policy"
  ON meridian_comments
  FOR ALL
  USING (user_id = auth.uid());
```

### Type

```typescript
export type CommentRow = {
  id: string
  user_id: string
  entity_type: 'object' | 'issue'
  entity_id: string
  body: string
  author_alias: string | null
  created_at: string
}
```

## UI: Comment Section

### Placement
Appears as a section at the bottom of both ObjectDetailPage and IssueDetailPage, below notes and above the stage history.

### Layout

```
┌─────────────────────────────────────────────┐
│  Comments (3)                               │
├─────────────────────────────────────────────┤
│  LEAD-DNA-01 · Feb 10, 2026                │
│  Discussed with SP team. They need the BOM  │
│  hierarchy before they can proceed.          │
├─────────────────────────────────────────────┤
│  ENG-ENB-01 · Feb 8, 2026                  │
│  Extraction is running in 3 parallel        │
│  batches. First batch completed.             │
├─────────────────────────────────────────────┤
│  [Add a comment...                    ] [→] │
└─────────────────────────────────────────────┘
```

### Comment Input
- Text input with placeholder "Add a comment..."
- Submit button (arrow icon) or Enter key to submit
- Shift+Enter for newlines
- Author alias is auto-filled from a user preference or manually entered on first comment

### Comment Display
- Most recent first (reverse chronological)
- Each comment shows:
  - Author alias (monospace, `--font-data`)
  - Relative timestamp ("2 hours ago", "Feb 10")
  - Comment body (preserves newlines)
- No edit or delete for v1 (comments are append-only audit trail)

## Implementation

### Hooks

```typescript
// src/hooks/useComments.ts
export function useComments(entityType: 'object' | 'issue', entityId: string | undefined)
// Returns: { data: CommentRow[], isLoading }

export function useCreateComment()
// Mutation: insert into meridian_comments
// Invalidates: ['comments', entityType, entityId]
```

### Component

```typescript
// src/components/CommentSection.tsx
interface Props {
  entityType: 'object' | 'issue'
  entityId: string
}
```

### Author Alias
- Stored in localStorage: `meridian_author_alias`
- If not set, first comment submission prompts: "Enter your alias (e.g., LEAD-DNA-01)"
- Alias persists across sessions
- Small "change alias" link next to the input

## Comment Count
Show comment count:
- In the section header: "Comments (3)"
- In object/issue list views: Small speech bubble icon with count (if >0)

## Mobile Considerations
- Comment input is fixed at the bottom of the comment section
- Long comments are truncated with "Show more" toggle
- Keyboard-aware: input scrolls into view when focused

## Future Extensions (not v1)
- @mentions with alias autocomplete
- Inline images / file attachments
- Email notifications on new comments
- Rich text formatting (markdown)
