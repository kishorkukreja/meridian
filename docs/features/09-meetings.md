# Feature: Meetings

## Purpose
Capture meeting context and turn it into structured, actionable records. The meetings system supports three modes -- full minutes of meeting (MoM), quick summaries for catch-up, and AI conversation extraction. Transcripts are processed by a Gemini-powered edge function that extracts structured fields: TLDR, discussion points, next steps with owners and due dates, action log, and an inspirational quote. Meetings can be linked to objects and issues, and next steps can be converted directly into tracked issues.

## User Stories

1. **As the DNA Lead, I want to** paste a meeting transcript and get structured minutes **so that** I have a clean record without manual formatting.
2. **As the DNA Lead, I want to** quickly summarize a meeting I missed **so that** I can catch up on key takeaways and action items.
3. **As the DNA Lead, I want to** extract issues from an AI conversation **so that** research and analysis become trackable actions.
4. **As the DNA Lead, I want to** link meetings to specific objects and issues **so that** meeting context is connected to the program tracker.
5. **As the DNA Lead, I want to** convert next steps into tracked issues **so that** action items from meetings feed directly into the issue register.
6. **As the DNA Lead, I want to** use voice input to dictate notes **so that** I can capture meeting content hands-free.
7. **As the DNA Lead, I want to** edit AI-generated minutes before saving **so that** I can correct or refine the output.

## Navigation

- Sidebar item: "Meetings" (below Issues)
- Routes:
  - `/meetings` -- Meeting list page
  - `/meetings/new` -- New meeting form
  - `/meetings/:id` -- Meeting detail page
  - `/meetings/:id/edit` -- Meeting edit page

## Meeting Types

Three modes are available, selected at the top of the meeting form:

| Mode | Label | Description | Output |
|------|-------|-------------|--------|
| `full_mom` | Full Minutes | Complete MoM with all sections | TLDR, discussion points, next steps, action log, quote |
| `quick_summary` | Quick Summary | Catch-up format for missed meetings | TLDR ("What You Missed"), key takeaways, action items (no action log) |
| `ai_conversation` | AI Chat | Extract issues from AI conversation dumps | Summary, topics covered, extracted issues |

## Meeting Form (Phase 1: Input)

Route: `/meetings/new`

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Meeting Type | Button group toggle | Yes | `full_mom` / `quick_summary` / `ai_conversation` |
| Title | Text input | Yes | e.g., "Weekly S&OP Sync" |
| Meeting Date | Date picker | Yes | Defaults to today |
| Transcript | Textarea | Yes | Paste, upload (.txt/.docx), or voice input |
| Linked Objects | Chip toggle list | No | Multi-select from active objects |
| Linked Issues | Chip toggle list | No | Multi-select from all issues |

### Transcript Input Methods

1. **Paste**: Direct paste into the textarea
2. **File upload**: Upload `.txt` or `.docx` files via `readTranscriptFile()` utility. Button labeled "Upload .txt / .docx"
3. **Voice input**: Browser Speech Recognition API via the `useVoiceInput` hook. Shows a microphone button when the browser supports `SpeechRecognition` or `webkitSpeechRecognition`. While listening, shows a red pulsing indicator and "Listening... Stop" button. Auto-restarts on silence. Transcript accumulates in real time.

### Submit Action

The "Generate Minutes" button (or "Generate Summary" / "Extract Issues" depending on mode) sends the transcript to the AI summarization edge function.

## AI Summarization (Phase 2: Review)

### Edge Function: `generate-mom`

- Endpoint: `{SUPABASE_URL}/functions/v1/generate-mom`
- Method: `POST`
- Auth: Bearer token from Supabase session
- Payload: `{ transcript: string, mode: MeetingType }`

### Response Shape

```typescript
type MoMResponse = {
  tldr: string
  discussion_points: string[]
  next_steps: { action: string; owner: string; due_date: string }[]
  action_log: string    // Only for full_mom mode
  quote: string         // Inspirational quote
  model_used: string    // e.g., "gemini-2.0-flash"
}
```

### Review Page

After generation, the form transitions to a review phase showing all extracted fields:

- **TLDR** (or "What You Missed" / "Summary"): Displayed in a left-border-accented card
- **Discussion Points** (or "Key Takeaways" / "Topics Covered"): Numbered list
- **Next Steps** (or "Action Items" / "Extracted Issues"): Table with Action, Owner, Due Date columns. Each row has a "Create Issue" button. A "Convert All to Issues" button appears below the table.
- **Action Log**: Monospace pre-formatted text (only for `full_mom` mode)
- **Meeting type badge**: Color-coded pill (accent for Full MoM, amber for Quick Summary, purple for AI Chat)
- **Model info**: Shows which AI model was used

### Edit Mode

A toggle between "Preview" and "Edit" allows inline editing of all generated fields:
- TLDR: textarea
- Discussion points: textarea (one per line)
- Next steps: editable grid with add/remove rows
- Action log: textarea

### Actions

- **Save Meeting**: Persists to `meridian_meetings` table
- **Edit**: Toggle edit mode for generated content
- **Regenerate**: Re-runs the edge function with the original transcript
- **Convert to Issues**: Opens `ConvertToIssueDialog` to create tracked issues from next steps (saves meeting first if not yet saved)

## Database Schema

### Table: `meridian_meetings`

```sql
CREATE TABLE meridian_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  transcript TEXT NOT NULL,
  meeting_type TEXT DEFAULT 'full_mom',     -- full_mom | quick_summary | ai_conversation
  tldr TEXT,
  discussion_points JSONB,                   -- string[]
  next_steps JSONB,                          -- { action, owner, due_date }[]
  action_log TEXT,
  model_used TEXT,
  quote TEXT,                                -- inspirational quote from AI
  linked_object_ids UUID[] DEFAULT '{}',
  linked_issue_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Types

```typescript
export type MeetingType = 'full_mom' | 'quick_summary' | 'ai_conversation'

export type NextStep = {
  action: string
  owner: string
  due_date: string
}

export type MeetingRow = {
  id: string
  user_id: string
  title: string
  meeting_date: string
  transcript: string
  meeting_type: MeetingType
  tldr: string | null
  discussion_points: string[] | null
  next_steps: NextStep[] | null
  action_log: string | null
  model_used: string | null
  quote: string | null
  linked_object_ids: string[]
  linked_issue_ids: string[]
  created_at: string
  updated_at: string
}
```

## Meeting Detail Page

Route: `/meetings/:id`

Shows all saved meeting data in a read-only layout:

- Header: Title, date, meeting type badge, model used
- TLDR section with accent left border
- Discussion points as numbered list
- Next steps table with action, owner, due date
- Action log in monospace (full_mom only)
- Inspirational quote (if present)
- Linked objects (clickable links to `/objects/:id`)
- Linked issues (clickable links to `/issues/:id`)
- Edit and Delete buttons

## Meeting List Page

Route: `/meetings`

- Table/list of all meetings, ordered by `meeting_date` descending
- Columns/fields: Date, Title, TLDR preview (truncated)
- Search by title (text input with ilike query)
- Sortable by date
- Click a row to navigate to detail page
- "+ New Meeting" button in header

## Meeting Edit Page

Route: `/meetings/:id/edit`

- Pre-fills the form with existing meeting data
- Allows editing all fields including transcript and generated content
- Regenerate button to re-process the transcript
- Save updates the existing record via `useUpdateMeeting()`

## Email Polish Feature

Turns issue comments into professional email drafts via a separate Gemini edge function.

### Edge Function: `polish-email`

- Endpoint: `{SUPABASE_URL}/functions/v1/polish-email`
- Method: `POST`
- Auth: Bearer token from Supabase session
- Payload: comment text plus context (issue title, object name, issue type, lifecycle stage, status, owner alias, comment author)
- Response: `{ subject: string, body: string }`

This is triggered from the `CommentSection` component on issue detail pages via the `usePolishEmail()` hook.

## Implementation

### Hooks

```typescript
// src/hooks/useMeetings.ts
export function useMeetings(search?, sort?, order?)     // List meetings
export function useMeeting(id)                           // Single meeting with resolved links
export function useCreateMeeting()                       // Insert mutation
export function useUpdateMeeting()                       // Update mutation
export function useDeleteMeeting()                       // Delete mutation
export function useGenerateMoM()                         // Edge function call
```

### Voice Input Hook

```typescript
// src/hooks/useVoiceInput.ts
export function useVoiceInput(onTranscript: (text: string) => void)
// Returns: { isListening, isSupported, startListening, stopListening }
```

Uses the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`):
- `continuous: true` for ongoing dictation
- `interimResults: true` for real-time feedback
- Auto-restarts when the browser stops on silence
- Cleans up recognition instance on unmount

### Pages

| Page | File | Route |
|------|------|-------|
| Meeting List | `src/pages/MeetingListPage.tsx` | `/meetings` |
| New Meeting | `src/pages/MeetingFormPage.tsx` | `/meetings/new` |
| Meeting Detail | `src/pages/MeetingDetailPage.tsx` | `/meetings/:id` |
| Meeting Edit | `src/pages/MeetingEditPage.tsx` | `/meetings/:id/edit` |

## Mobile Considerations

- Meeting form: Full width, stacked fields
- Voice button: Visible when supported, compact layout
- Review phase: Cards stack vertically, next steps table scrolls horizontally
- Meeting list: Card layout with date, title, and TLDR preview
