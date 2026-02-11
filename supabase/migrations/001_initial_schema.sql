-- Migration: 001_initial_schema
-- Creates all tables, enums, triggers, RLS policies, and indexes

-- ============================================
-- ENUMS
-- ============================================

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

CREATE TYPE module_type AS ENUM (
  'demand_planning',
  'supply_planning'
);

CREATE TYPE object_category AS ENUM (
  'master_data',
  'drivers',
  'priority_1',
  'priority_2',
  'priority_3'
);

CREATE TYPE source_system AS ENUM (
  'erp_primary',
  'manual_file',
  'external_1',
  'external_2',
  'data_lake',
  'sub_system',
  'other'
);

CREATE TYPE issue_type AS ENUM (
  'mapping',
  'data_quality',
  'dependency',
  'signoff',
  'technical',
  'clarification',
  'other'
);

CREATE TYPE issue_status AS ENUM (
  'open',
  'in_progress',
  'blocked',
  'resolved',
  'closed'
);

CREATE TYPE object_status AS ENUM (
  'on_track',
  'at_risk',
  'blocked',
  'completed',
  'archived'
);

CREATE TYPE region_type AS ENUM (
  'region_eu',
  'region_na',
  'region_apac',
  'region_latam',
  'region_mea',
  'global'
);

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  description     TEXT,
  module          module_type NOT NULL,
  category        object_category NOT NULL,
  region          region_type NOT NULL DEFAULT 'region_eu',
  source_system   source_system NOT NULL,
  current_stage   lifecycle_stage NOT NULL DEFAULT 'requirements',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          object_status NOT NULL DEFAULT 'on_track',
  owner_alias     TEXT,
  team_alias      TEXT,
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  object_id             UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  issue_type            issue_type NOT NULL,
  lifecycle_stage       lifecycle_stage NOT NULL,
  status                issue_status NOT NULL DEFAULT 'open',
  owner_alias           TEXT,
  raised_by_alias       TEXT,
  blocked_by_object_id  UUID REFERENCES objects(id),
  blocked_by_note       TEXT,
  decision              TEXT,
  resolved_at           TIMESTAMPTZ,
  is_archived           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  from_stage      lifecycle_stage NOT NULL,
  to_stage        lifecycle_stage NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_objects_module ON objects(module);
CREATE INDEX idx_objects_status ON objects(status);
CREATE INDEX idx_objects_stage ON objects(current_stage);
CREATE INDEX idx_objects_archived ON objects(is_archived);
CREATE INDEX idx_objects_user ON objects(user_id);

CREATE INDEX idx_issues_object ON issues(object_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_type ON issues(issue_type);
CREATE INDEX idx_issues_archived ON issues(is_archived);
CREATE INDEX idx_issues_user ON issues(user_id);

CREATE INDEX idx_stage_history_object ON stage_history(object_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO stage_history (object_id, from_stage, to_stage, note)
    VALUES (NEW.id, OLD.current_stage, NEW.current_stage, NULL);
    NEW.stage_entered_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stage_transition
BEFORE UPDATE ON objects
FOR EACH ROW
EXECUTE FUNCTION log_stage_transition();

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

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objects_user_policy" ON objects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "issues_user_policy" ON issues
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "stage_history_user_policy" ON stage_history
  FOR ALL USING (
    object_id IN (SELECT id FROM objects WHERE user_id = auth.uid())
  );
