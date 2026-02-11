# Data Model Context

## Overview

The database has 4 core tables and 2 supporting tables. The design is intentionally flat - no deep nesting. Hierarchy lives in views and filters, not in the schema.

## Entity Relationship

```
┌─────────────┐       ┌─────────────────┐
│   objects    │──1:N──│     issues      │
│              │       │                 │
│  lifecycle   │       │  lifecycle_stage│ ← stage where issue was raised
│  stage       │       │  blocked_by     │ ← FK to another object (optional)
│              │       │  decision       │ ← populated on closure
└──────┬───── ┘       └─────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────┐
│  stage_history   │ ← audit trail of stage transitions
│                  │
│  from_stage      │
│  to_stage        │
│  transitioned_at │
└──────────────────┘
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
  'supply_planning'
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

## Tables

### objects
The primary entity. Every data object being migrated.

```sql
CREATE TABLE objects (
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

-- Index for common filters
CREATE INDEX idx_objects_module ON objects(module);
CREATE INDEX idx_objects_status ON objects(status);
CREATE INDEX idx_objects_stage ON objects(current_stage);
CREATE INDEX idx_objects_archived ON objects(is_archived);
CREATE INDEX idx_objects_user ON objects(user_id);
```

### issues
Linked to objects. Captures blockers, questions, decisions.

```sql
CREATE TABLE issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  
  -- Link to object
  object_id         UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  
  -- Context
  title             TEXT NOT NULL,
  description       TEXT,
  issue_type        issue_type NOT NULL,
  lifecycle_stage   lifecycle_stage NOT NULL,  -- Stage where this issue was raised
  
  -- Status
  status            issue_status NOT NULL DEFAULT 'open',
  
  -- Ownership
  owner_alias       TEXT,                      -- Who owns resolving this
  raised_by_alias   TEXT,                      -- Who raised it
  
  -- Dependencies
  blocked_by_object_id  UUID REFERENCES objects(id),  -- Optional: blocked by another object
  blocked_by_note       TEXT,                          -- Freetext: "Waiting for X from Y"
  
  -- Resolution
  decision          TEXT,                      -- Populated when resolved/closed
  resolved_at       TIMESTAMPTZ,
  
  -- Metadata
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_issues_object ON issues(object_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_type ON issues(issue_type);
CREATE INDEX idx_issues_archived ON issues(is_archived);
CREATE INDEX idx_issues_user ON issues(user_id);
```

### stage_history
Audit trail for lifecycle transitions. Auto-populated via trigger.

```sql
CREATE TABLE stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  
  from_stage      lifecycle_stage NOT NULL,
  to_stage        lifecycle_stage NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT                         -- Optional context for the transition
);

CREATE INDEX idx_stage_history_object ON stage_history(object_id);
```

### Trigger: Auto-log stage transitions

```sql
CREATE OR REPLACE FUNCTION log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO stage_history (object_id, from_stage, to_stage, note)
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
BEFORE UPDATE ON objects
FOR EACH ROW
EXECUTE FUNCTION log_stage_transition();
```

### Trigger: Auto-update updated_at on issues

```sql
CREATE OR REPLACE FUNCTION update_issue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_issue_updated
BEFORE UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION update_issue_timestamp();
```

## Row-Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

-- Objects: user can only see/modify their own
CREATE POLICY "objects_user_policy" ON objects
  FOR ALL USING (auth.uid() = user_id);

-- Issues: user can only see/modify their own
CREATE POLICY "issues_user_policy" ON issues
  FOR ALL USING (auth.uid() = user_id);

-- Stage history: accessible if user owns the parent object
CREATE POLICY "stage_history_user_policy" ON stage_history
  FOR ALL USING (
    object_id IN (SELECT id FROM objects WHERE user_id = auth.uid())
  );
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
// Derived from a join or separate query
const openIssueCount = issues.filter(i => i.object_id === object.id && i.status !== 'closed').length;
```

### Progress Percentage
```typescript
const stages = ['requirements', 'mapping', 'extraction', 'ingestion', 'transformation', 'push_to_target', 'validation', 'signoff', 'live'];
const progressPercent = Math.round(((stages.indexOf(object.current_stage) + 1) / stages.length) * 100);
```

## Seed Data

See `supabase/seed/` for development seed data that populates realistic (but masked) objects and issues across both modules.
