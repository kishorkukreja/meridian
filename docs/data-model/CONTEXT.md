# Data Model Context

## Overview

The database has 9 core tables and 2 supporting tables (11 total). The design is intentionally flat -- no deep nesting. Hierarchy lives in views and filters, not in the schema. Polymorphic relationships (comments, pins) use an `entity_type` discriminator column rather than separate join tables.

## Entity Relationship

```
┌─────────────────────┐       ┌──────────────────────┐
│  meridian_objects    │◄──────│  meridian_issues     │
│                     │ M:N   │                      │
│  lifecycle stage    │(via    │  linked_object_ids[] │ <- JSONB array of object UUIDs
│  module, category   │ JSONB) │  next_action         │
│  status, region     │       │  decision            │
└──────┬──────────────┘       └──────┬───────────────┘
       │                             │
       │ 1:N                         │
       ▼                             │
┌──────────────────────┐             │
│  meridian_stage_     │             │
│  history             │             │
│                      │             │
│  from_stage          │             │
│  to_stage            │             │
│  transitioned_at     │             │
└──────────────────────┘             │
                                     │
       ┌─────────────────────────────┘
       │
       │  Polymorphic (entity_type: 'object' | 'issue')
       ▼
┌──────────────────────┐      ┌──────────────────────┐
│  meridian_comments   │      │  meridian_pins        │
│                      │      │                       │
│  entity_type         │      │  entity_type          │
│  entity_id           │      │  entity_id            │
│  body                │      │  user_id              │
└──────────────────────┘      └───────────────────────┘

┌──────────────────────┐      ┌────────────────────────────┐
│  meridian_meetings   │      │  meridian_recurring_       │
│                      │      │  meetings                  │
│  meeting_type        │      │                            │
│  transcript          │      │  recurrence_pattern        │
│  tldr, next_steps    │      │  day_of_week, time_of_day  │
│  discussion_points   │      │  duration                  │
│  action_log          │      │  linked items              │
│  linked_object_ids[] │      └─────────────┬──────────────┘
│  linked_issue_ids[]  │                    │
│  model_used, quote   │                    │ 1:N
└──────────────────────┘                    ▼
                              ┌────────────────────────────┐
                              │  meridian_schedule_logs     │
                              │                            │
                              │  recurring_meeting_id (FK) │
                              │  occurrence_date           │
                              │  status                    │
                              └────────────────────────────┘

┌──────────────────────┐
│  meridian_api_tokens │
│                      │
│  token_hash          │
│  token_prefix        │
│  scopes[]            │
│  expires_at          │
│  revoked_at          │
│  last_used_at        │
└──────────────────────┘
```

## Enums

### lifecycle_stage
The ordered stages every data object passes through:

```sql
CREATE TYPE lifecycle_stage AS ENUM (
  'requirements',
  'mapping',
  'extraction',
  'ingestion',
  'transformation',
  'push_to_target',
  'validation',
  'signoff',
  'live'
);
```

### module_type
```sql
CREATE TYPE module_type AS ENUM (
  'demand_planning',
  'supply_planning',
  'supply_planning_ibp',
  'data_infrastructure',
  'program_management'
);
```

### object_category
```sql
CREATE TYPE object_category AS ENUM (
  'master_data',
  'drivers',
  'priority_1',
  'priority_2',
  'priority_3'
);
```

### source_system
```sql
CREATE TYPE source_system AS ENUM (
  'erp_primary',      -- SAP SCC (masked)
  'manual_file',
  'external_1',       -- e.g., Nielsen (masked)
  'external_2',       -- e.g., IRI/RedMail (masked)
  'data_lake',
  'sub_system',
  'other'
);
```

### issue_type
```sql
CREATE TYPE issue_type AS ENUM (
  'mapping',
  'data_quality',
  'dependency',
  'signoff',
  'technical',
  'clarification',
  'other'
);
```

### issue_status
```sql
CREATE TYPE issue_status AS ENUM (
  'open',
  'in_progress',
  'blocked',
  'resolved',
  'closed'
);
```

### object_status
```sql
CREATE TYPE object_status AS ENUM (
  'on_track',
  'at_risk',
  'blocked',
  'completed',
  'archived'
);
```

### region_type
```sql
CREATE TYPE region_type AS ENUM (
  'region_eu',
  'region_na',
  'region_apac',
  'region_latam',
  'region_mea',
  'global'
);
```

### next_action
Recommended follow-up action for an issue:

```sql
CREATE TYPE next_action AS ENUM (
  'observe',
  'follow_up',
  'set_meeting'
);
```

### meeting_type
The format/depth of AI-generated meeting output:

```sql
CREATE TYPE meeting_type AS ENUM (
  'full_mom',
  'quick_summary',
  'ai_conversation'
);
```

### recurrence_pattern
How often a recurring meeting repeats:

```sql
CREATE TYPE recurrence_pattern AS ENUM (
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'custom'
);
```

### api_token_scope
Permissions granted to an API token:

```sql
CREATE TYPE api_token_scope AS ENUM (
  'issues:read',
  'issues:write'
);
```

## Tables

### meridian_objects
The primary entity. Every data object being migrated.

```sql
CREATE TABLE meridian_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),

  -- Identity
  name            TEXT NOT NULL,              -- Masked name, e.g., "OBJ-DP-MD-001"
  description     TEXT,                       -- What this object represents

  -- Classification
  module          module_type NOT NULL,
  category        object_category NOT NULL,
  region          region_type NOT NULL DEFAULT 'region_eu',
  source_system   source_system NOT NULL,

  -- Lifecycle
  current_stage   lifecycle_stage NOT NULL DEFAULT 'requirements',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- When it entered current stage
  status          object_status NOT NULL DEFAULT 'on_track',

  -- Ownership
  owner_alias     TEXT,                       -- Masked owner, e.g., "LEAD-DP-01"
  team_alias      TEXT,                       -- Masked team, e.g., "TEAM-MDS-DP"

  -- Notes
  notes           TEXT,

  -- Metadata
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common filters
CREATE INDEX idx_objects_module ON meridian_objects(module);
CREATE INDEX idx_objects_status ON meridian_objects(status);
CREATE INDEX idx_objects_stage ON meridian_objects(current_stage);
CREATE INDEX idx_objects_archived ON meridian_objects(is_archived);
CREATE INDEX idx_objects_user ON meridian_objects(user_id);
```

### meridian_issues
Linked to objects. Captures blockers, questions, decisions.

```sql
CREATE TABLE meridian_issues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),

  -- Link to objects (many-to-many via JSONB array)
  linked_object_ids     JSONB DEFAULT '[]',     -- Array of object UUIDs this issue relates to

  -- Context
  title                 TEXT NOT NULL,
  description           TEXT,
  issue_type            issue_type NOT NULL,
  lifecycle_stage       lifecycle_stage NOT NULL,  -- Stage where this issue was raised

  -- Status
  status                issue_status NOT NULL DEFAULT 'open',
  next_action           next_action,               -- Recommended follow-up action

  -- Ownership
  owner_alias           TEXT,                      -- Who owns resolving this
  raised_by_alias       TEXT,                      -- Who raised it

  -- Dependencies
  blocked_by_object_id  UUID REFERENCES meridian_objects(id),  -- Optional: blocked by another object
  blocked_by_note       TEXT,                                  -- Freetext: "Waiting for X from Y"

  -- Resolution
  decision              TEXT,                      -- Populated when resolved/closed
  resolved_at           TIMESTAMPTZ,

  -- Metadata
  is_archived           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_issues_status ON meridian_issues(status);
CREATE INDEX idx_issues_type ON meridian_issues(issue_type);
CREATE INDEX idx_issues_archived ON meridian_issues(is_archived);
CREATE INDEX idx_issues_user ON meridian_issues(user_id);
```

### meridian_stage_history
Audit trail for lifecycle transitions. Auto-populated via trigger.

```sql
CREATE TABLE meridian_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       UUID NOT NULL REFERENCES meridian_objects(id) ON DELETE CASCADE,

  from_stage      lifecycle_stage NOT NULL,
  to_stage        lifecycle_stage NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT                         -- Optional context for the transition
);

CREATE INDEX idx_stage_history_object ON meridian_stage_history(object_id);
```

### meridian_comments
Polymorphic comment thread. Supports both objects and issues via `entity_type`.

```sql
CREATE TABLE meridian_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Polymorphic target
  entity_type TEXT NOT NULL CHECK (entity_type IN ('object', 'issue')),
  entity_id   UUID NOT NULL,               -- References either meridian_objects.id or meridian_issues.id

  -- Content
  body        TEXT NOT NULL,

  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_entity ON meridian_comments(entity_type, entity_id);
CREATE INDEX idx_comments_user ON meridian_comments(user_id);
```

### meridian_meetings
Meeting records with AI-generated structured output.

```sql
CREATE TABLE meridian_meetings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),

  -- Identity
  title               TEXT NOT NULL,

  -- Input
  transcript          TEXT,                    -- Raw transcript or notes pasted by user

  -- AI output
  meeting_type        meeting_type NOT NULL DEFAULT 'full_mom',
  tldr                TEXT,                    -- One-line summary
  discussion_points   JSONB DEFAULT '[]',      -- Array of discussion point objects
  next_steps          JSONB DEFAULT '[]',      -- Array of next step objects
  action_log          JSONB DEFAULT '[]',      -- Array of action item objects
  model_used          TEXT,                    -- e.g., "gemini-2.0-flash"
  quote               TEXT,                    -- Notable quote from the meeting

  -- Links
  linked_object_ids   JSONB DEFAULT '[]',      -- Array of related object UUIDs
  linked_issue_ids    JSONB DEFAULT '[]',      -- Array of related issue UUIDs

  -- Metadata
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_user ON meridian_meetings(user_id);
CREATE INDEX idx_meetings_type ON meridian_meetings(meeting_type);
```

### meridian_recurring_meetings
Definitions for meetings that repeat on a schedule.

```sql
CREATE TABLE meridian_recurring_meetings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),

  -- Identity
  name                TEXT NOT NULL,

  -- Schedule
  recurrence_pattern  recurrence_pattern NOT NULL DEFAULT 'weekly',
  day_of_week         INTEGER,                 -- 0=Sunday, 6=Saturday (for weekly/biweekly)
  time_of_day         TIME,                    -- Start time
  duration            INTEGER,                 -- Duration in minutes

  -- Links
  linked_object_ids   JSONB DEFAULT '[]',      -- Array of related object UUIDs
  linked_issue_ids    JSONB DEFAULT '[]',      -- Array of related issue UUIDs

  -- Metadata
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_meetings_user ON meridian_recurring_meetings(user_id);
CREATE INDEX idx_recurring_meetings_active ON meridian_recurring_meetings(is_active);
```

### meridian_schedule_logs
Tracks individual occurrences of recurring meetings.

```sql
CREATE TABLE meridian_schedule_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_meeting_id  UUID NOT NULL REFERENCES meridian_recurring_meetings(id) ON DELETE CASCADE,

  -- Occurrence
  occurrence_date       DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled, completed, skipped, cancelled
  meeting_id            UUID REFERENCES meridian_meetings(id),  -- Link to actual meeting record if created

  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_logs_recurring ON meridian_schedule_logs(recurring_meeting_id);
CREATE INDEX idx_schedule_logs_date ON meridian_schedule_logs(occurrence_date);
```

### meridian_api_tokens
API tokens for external integrations (e.g., programmatic issue access).

```sql
CREATE TABLE meridian_api_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),

  -- Token identity
  name          TEXT NOT NULL,                -- User-friendly label, e.g., "Power Automate"
  token_hash    TEXT NOT NULL,                -- SHA-256 hash of the actual token (never store plaintext)
  token_prefix  TEXT NOT NULL,                -- First 8 chars for display, e.g., "mrd_a1b2..."

  -- Permissions
  scopes        JSONB NOT NULL DEFAULT '[]',  -- Array of api_token_scope values

  -- Lifecycle
  expires_at    TIMESTAMPTZ,                  -- NULL = no expiration
  revoked_at    TIMESTAMPTZ,                  -- NULL = active, set on revocation
  last_used_at  TIMESTAMPTZ,                  -- Updated on each API call

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_tokens_user ON meridian_api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON meridian_api_tokens(token_hash);
```

### meridian_pins
User-pinned entities for quick access on the dashboard.

```sql
CREATE TABLE meridian_pins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Polymorphic target
  entity_type TEXT NOT NULL CHECK (entity_type IN ('object', 'issue')),
  entity_id   UUID NOT NULL,

  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate pins
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_pins_user ON meridian_pins(user_id);
CREATE INDEX idx_pins_entity ON meridian_pins(entity_type, entity_id);
```

## Triggers

### Auto-log stage transitions

```sql
CREATE OR REPLACE FUNCTION log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO meridian_stage_history (object_id, from_stage, to_stage, note)
    VALUES (NEW.id, OLD.current_stage, NEW.current_stage, NULL);

    -- Update stage_entered_at
    NEW.stage_entered_at = now();
  END IF;

  -- Update updated_at
  NEW.updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stage_transition
BEFORE UPDATE ON meridian_objects
FOR EACH ROW
EXECUTE FUNCTION log_stage_transition();
```

### Auto-update updated_at on issues

```sql
CREATE OR REPLACE FUNCTION update_issue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_issue_updated
BEFORE UPDATE ON meridian_issues
FOR EACH ROW
EXECUTE FUNCTION update_issue_timestamp();
```

## Row-Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE meridian_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_recurring_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_schedule_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_pins ENABLE ROW LEVEL SECURITY;

-- Objects: user can only see/modify their own
CREATE POLICY "objects_user_policy" ON meridian_objects
  FOR ALL USING (auth.uid() = user_id);

-- Issues: user can only see/modify their own
CREATE POLICY "issues_user_policy" ON meridian_issues
  FOR ALL USING (auth.uid() = user_id);

-- Stage history: accessible if user owns the parent object
CREATE POLICY "stage_history_user_policy" ON meridian_stage_history
  FOR ALL USING (
    object_id IN (SELECT id FROM meridian_objects WHERE user_id = auth.uid())
  );

-- Comments: user can only see/modify their own
CREATE POLICY "comments_user_policy" ON meridian_comments
  FOR ALL USING (auth.uid() = user_id);

-- Meetings: user can only see/modify their own
CREATE POLICY "meetings_user_policy" ON meridian_meetings
  FOR ALL USING (auth.uid() = user_id);

-- Recurring meetings: user can only see/modify their own
CREATE POLICY "recurring_meetings_user_policy" ON meridian_recurring_meetings
  FOR ALL USING (auth.uid() = user_id);

-- Schedule logs: accessible if user owns the parent recurring meeting
CREATE POLICY "schedule_logs_user_policy" ON meridian_schedule_logs
  FOR ALL USING (
    recurring_meeting_id IN (
      SELECT id FROM meridian_recurring_meetings WHERE user_id = auth.uid()
    )
  );

-- API tokens: user can only see/modify their own
CREATE POLICY "api_tokens_user_policy" ON meridian_api_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Pins: user can only see/modify their own
CREATE POLICY "pins_user_policy" ON meridian_pins
  FOR ALL USING (auth.uid() = user_id);
```

## Computed Fields (Client-Side)

These are NOT stored in the database. Computed in React:

### Aging (days at current stage)
```typescript
const agingDays = Math.floor(
  (Date.now() - new Date(object.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
);
```

### Issue Count per Object
```typescript
// Derived by filtering issues whose linked_object_ids includes the object ID
const openIssueCount = issues.filter(
  i => i.linked_object_ids.includes(object.id) && i.status !== 'closed'
).length;
```

### Progress Percentage
```typescript
const stages = [
  'requirements', 'mapping', 'extraction', 'ingestion',
  'transformation', 'push_to_target', 'validation', 'signoff', 'live'
];
const progressPercent = Math.round(
  ((stages.indexOf(object.current_stage) + 1) / stages.length) * 100
);
```

## Table Summary

| # | Table | Row Count Driver | Purpose |
|---|-------|------------------|---------|
| 1 | `meridian_objects` | Dozens to low hundreds | Core data objects being migrated |
| 2 | `meridian_issues` | Hundreds | Blockers, questions, and decisions linked to objects |
| 3 | `meridian_stage_history` | Hundreds | Audit trail of every lifecycle stage transition |
| 4 | `meridian_comments` | Hundreds | Threaded comments on objects and issues |
| 5 | `meridian_meetings` | Tens to hundreds | Meeting records with AI-generated structured output |
| 6 | `meridian_recurring_meetings` | Tens | Recurring meeting schedule definitions |
| 7 | `meridian_schedule_logs` | Hundreds | Individual occurrence tracking for recurring meetings |
| 8 | `meridian_api_tokens` | Single digits | External API access tokens |
| 9 | `meridian_pins` | Tens | User-pinned items for dashboard quick access |

## Seed Data

See `supabase/seed/` for development seed data that populates realistic (but masked) objects and issues across all modules.
