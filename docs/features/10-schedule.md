# Feature: Recurring Meetings and Schedule

## Purpose
Track recurring meetings that happen on a regular cadence (daily standups, weekly syncs, biweekly reviews, monthly steering committees). The schedule provides a calendar-style view of upcoming occurrences, lets the DNA Lead log whether meetings were attended and invites sent, and links meetings to relevant objects and issues for traceability.

## User Stories

1. **As the DNA Lead, I want to** define recurring meetings with their cadence and time **so that** I have a structured view of my meeting commitments.
2. **As the DNA Lead, I want to** see upcoming meetings for the next 7 days **so that** I can prepare and prioritize my schedule.
3. **As the DNA Lead, I want to** log whether I attended a meeting and sent invites **so that** I have a record of meeting follow-through.
4. **As the DNA Lead, I want to** link recurring meetings to specific objects and issues **so that** meeting context is connected to program items.
5. **As the DNA Lead, I want to** deactivate a recurring meeting when it ends **so that** it no longer appears in my upcoming schedule.

## Navigation

- Sidebar item: "Schedule" (below Meetings)
- Routes:
  - `/schedule` -- Schedule view page (day or week)
  - `/schedule/new` -- Create recurring meeting
  - `/schedule/edit/:id` -- Edit recurring meeting
  - `/schedule/manage` -- Manage all recurring meetings

## Recurrence Patterns

```sql
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'custom');
```

| Pattern | Fields Used | Example |
|---------|------------|---------|
| `daily` | `time_of_day` | Every day at 09:00 |
| `weekly` | `day_of_week`, `time_of_day` | Every Monday at 10:00 |
| `biweekly` | `day_of_week`, `time_of_day` | Every other Wednesday at 14:00 |
| `monthly` | `day_of_month`, `time_of_day` | 1st of every month at 09:00 |
| `custom` | `custom_interval_days`, `time_of_day` | Every 3 days at 11:00 |

## Create/Edit Recurring Meeting Form

Route: `/schedule/new` (create) or `/schedule/edit/:id` (edit)

### Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text input | Yes | - | e.g., "Weekly S&OP Sync" |
| Description | Textarea | No | - | Optional context |
| Recurrence | Dropdown | Yes | `weekly` | daily/weekly/biweekly/monthly/custom |
| Day of Week | Dropdown (Sun-Sat) | Conditional | Monday | Shown for weekly/biweekly |
| Day of Month | Number input (1-31) | Conditional | 1 | Shown for monthly |
| Custom Interval | Number input | Conditional | 3 | Shown for custom (days between occurrences) |
| Time | Time input | Yes | 09:00 | Meeting start time |
| Duration | Number input (minutes) | Yes | 60 | Meeting duration |
| Start Date | Date picker | Yes | Today | When recurrence begins |
| End Date | Date picker | No | - | When recurrence ends (null = ongoing) |
| Linked Objects | Chip toggle list | No | - | Multi-select from active objects |
| Linked Issues | Chip toggle list | No | - | Multi-select from all issues |

The form conditionally shows fields based on the selected recurrence pattern. For example, "Day of Week" only appears when recurrence is `weekly` or `biweekly`.

## Schedule Page

Route: `/schedule`

### View Modes

Two view modes, togglable via a button group in the header:

| Mode | URL Param | Description |
|------|-----------|-------------|
| Day | `?view=day` | Single day, all occurrences for that date |
| Week | `?view=week` | 7-day grid, occurrences grouped by day |

### Date Navigation

- Previous/Next buttons (step by 1 day or 7 days depending on view)
- "Today" button to jump to current date
- Date state is URL-driven via `?date=YYYY-MM-DD` search param
- Header shows formatted date label (e.g., "Monday, February 14, 2026" or "February 10 - 16, 2026")

### Day View (`ScheduleDayView` component)

Shows all occurrences for the selected date as a vertical list:
- Each row: time, meeting name, duration, attendance status
- Inline controls to toggle "Invite Sent" and "Attended" checkboxes
- Notes field (expandable) for per-occurrence notes
- Empty state when no meetings are scheduled for the day

### Week View (`ScheduleWeekView` component)

Shows a 7-day grid (Monday through Sunday):
- Each day column lists its occurrences
- Today's column is visually highlighted
- Compact layout: time and meeting name per row
- Click an occurrence to expand inline or navigate

### Action Needed Panel (`ActionNeededPanel` component)

Displayed above the schedule view. Shows occurrences for today and the next day where:
- Invites have not yet been sent
- Meeting has not yet been attended

This surfaces items requiring immediate action.

### Header Actions

- "Manage Meetings" button: navigates to `/schedule/manage`
- "+ New Meeting" button: navigates to `/schedule/new`

## Schedule Logs

Each occurrence can have a log entry tracking attendance and notes.

### Log Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `invite_sent` | Boolean | `false` | Whether calendar invite was sent |
| `attended` | Boolean | `false` | Whether the meeting was attended |
| `notes` | Text | null | Per-occurrence notes |

Logs are created on first interaction (upsert pattern using `recurring_meeting_id` + `occurrence_date` as unique constraint).

## Manage Recurring Meetings Page

Route: `/schedule/manage`

Lists all recurring meetings (active and inactive):
- Name, recurrence pattern, day/time, active status
- Edit button: navigates to `/schedule/edit/:id`
- Deactivate/Activate toggle: sets `is_active` to `false`/`true`
- Delete button: permanently removes the recurring meeting and its logs

## Database Schema

### Table: `meridian_recurring_meetings`

```sql
CREATE TABLE meridian_recurring_meetings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  name                  TEXT NOT NULL,
  description           TEXT,
  recurrence            recurrence_pattern NOT NULL DEFAULT 'weekly',
  day_of_week           SMALLINT,          -- 0=Sun..6=Sat
  day_of_month          SMALLINT,          -- 1-31
  time_of_day           TIME NOT NULL DEFAULT '09:00',
  duration_minutes      SMALLINT NOT NULL DEFAULT 60,
  custom_interval_days  SMALLINT,          -- for custom recurrence
  start_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date              DATE,              -- null = no end
  linked_object_ids     UUID[] NOT NULL DEFAULT '{}',
  linked_issue_ids      UUID[] NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table: `meridian_schedule_logs`

```sql
CREATE TABLE meridian_schedule_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  recurring_meeting_id  UUID NOT NULL REFERENCES meridian_recurring_meetings(id) ON DELETE CASCADE,
  occurrence_date       DATE NOT NULL,
  invite_sent           BOOLEAN NOT NULL DEFAULT false,
  attended              BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_meeting_id, occurrence_date)
);
```

### Types

```typescript
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export type RecurringMeetingRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  recurrence: RecurrencePattern
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  duration_minutes: number
  custom_interval_days: number | null
  start_date: string
  end_date: string | null
  linked_object_ids: string[]
  linked_issue_ids: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ScheduleLogRow = {
  id: string
  user_id: string
  recurring_meeting_id: string
  occurrence_date: string
  invite_sent: boolean
  attended: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type ScheduleOccurrence = {
  meeting: RecurringMeetingRow
  date: string
  log: ScheduleLogRow | null
  is_past: boolean
  is_today: boolean
}
```

## Occurrence Generation

Occurrences are computed client-side from recurring meeting definitions. No occurrence rows are stored in the database -- only schedule logs are persisted when the user interacts with an occurrence.

The `generateOccurrences(meeting, rangeStart, rangeEnd)` utility in `src/lib/recurrence.ts` computes which dates fall within a given range based on the recurrence pattern, start date, end date, and relevant day/interval fields.

## Implementation

### Hooks

```typescript
// src/hooks/useSchedule.ts
export function useRecurringMeetings()                              // List all recurring meetings
export function useRecurringMeeting(id)                             // Single recurring meeting
export function useCreateRecurringMeeting()                         // Insert mutation
export function useUpdateRecurringMeeting()                         // Update mutation
export function useDeleteRecurringMeeting()                         // Delete mutation
export function useScheduleOccurrences(rangeStart, rangeEnd)        // Computed occurrences with logs
export function useUpsertScheduleLog()                              // Create/update log entry
```

### Pages

| Page | File | Route |
|------|------|-------|
| Schedule | `src/pages/SchedulePage.tsx` | `/schedule` |
| Create Recurring | `src/pages/RecurringMeetingFormPage.tsx` | `/schedule/new` |
| Edit Recurring | `src/pages/RecurringMeetingFormPage.tsx` | `/schedule/edit/:id` |
| Manage Meetings | `src/pages/RecurringMeetingListPage.tsx` | `/schedule/manage` |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| ScheduleDayView | `src/components/ScheduleDayView.tsx` | Single-day occurrence list |
| ScheduleWeekView | `src/components/ScheduleWeekView.tsx` | 7-day grid layout |
| ScheduleOccurrenceRow | `src/components/ScheduleOccurrenceRow.tsx` | Individual occurrence row with log controls |
| ActionNeededPanel | `src/components/ActionNeededPanel.tsx` | Surfaces uninvited/unattended meetings |

## Mobile Considerations

- Schedule view: Defaults to day view on mobile for better readability
- Week view: Horizontally scrollable if needed
- Date navigation: Compact button group
- Occurrence rows: Full-width cards with stacked fields
- Log checkboxes: Touch-friendly sizing
