-- Migration: 001_initial_schema
-- Creates all tables, enums, triggers, RLS policies, and indexes
-- All objects prefixed with meridian_ to avoid collisions in shared Supabase project

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE meridian_lifecycle_stage AS ENUM (
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

CREATE TYPE meridian_module_type AS ENUM (
  'demand_planning',
  'supply_planning'
);

CREATE TYPE meridian_object_category AS ENUM (
  'master_data',
  'drivers',
  'priority_1',
  'priority_2',
  'priority_3'
);

CREATE TYPE meridian_source_system AS ENUM (
  'erp_primary',
  'manual_file',
  'external_1',
  'external_2',
  'data_lake',
  'sub_system',
  'other'
);

CREATE TYPE meridian_issue_type AS ENUM (
  'mapping',
  'data_quality',
  'dependency',
  'signoff',
  'technical',
  'clarification',
  'other'
);

CREATE TYPE meridian_issue_status AS ENUM (
  'open',
  'in_progress',
  'blocked',
  'resolved',
  'closed'
);

CREATE TYPE meridian_object_status AS ENUM (
  'on_track',
  'at_risk',
  'blocked',
  'completed',
  'archived'
);

CREATE TYPE meridian_region_type AS ENUM (
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

CREATE TABLE meridian_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  description     TEXT,
  module          meridian_module_type NOT NULL,
  category        meridian_object_category NOT NULL,
  region          meridian_region_type NOT NULL DEFAULT 'region_eu',
  source_system   meridian_source_system NOT NULL,
  current_stage   meridian_lifecycle_stage NOT NULL DEFAULT 'requirements',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          meridian_object_status NOT NULL DEFAULT 'on_track',
  owner_alias     TEXT,
  team_alias      TEXT,
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meridian_issues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  object_id             UUID NOT NULL REFERENCES meridian_objects(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  issue_type            meridian_issue_type NOT NULL,
  lifecycle_stage       meridian_lifecycle_stage NOT NULL,
  status                meridian_issue_status NOT NULL DEFAULT 'open',
  owner_alias           TEXT,
  raised_by_alias       TEXT,
  blocked_by_object_id  UUID REFERENCES meridian_objects(id),
  blocked_by_note       TEXT,
  decision              TEXT,
  resolved_at           TIMESTAMPTZ,
  is_archived           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meridian_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       UUID NOT NULL REFERENCES meridian_objects(id) ON DELETE CASCADE,
  from_stage      meridian_lifecycle_stage NOT NULL,
  to_stage        meridian_lifecycle_stage NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_meridian_objects_module ON meridian_objects(module);
CREATE INDEX idx_meridian_objects_status ON meridian_objects(status);
CREATE INDEX idx_meridian_objects_stage ON meridian_objects(current_stage);
CREATE INDEX idx_meridian_objects_archived ON meridian_objects(is_archived);
CREATE INDEX idx_meridian_objects_user ON meridian_objects(user_id);

CREATE INDEX idx_meridian_issues_object ON meridian_issues(object_id);
CREATE INDEX idx_meridian_issues_status ON meridian_issues(status);
CREATE INDEX idx_meridian_issues_type ON meridian_issues(issue_type);
CREATE INDEX idx_meridian_issues_archived ON meridian_issues(is_archived);
CREATE INDEX idx_meridian_issues_user ON meridian_issues(user_id);

CREATE INDEX idx_meridian_stage_history_object ON meridian_stage_history(object_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION meridian_log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO meridian_stage_history (object_id, from_stage, to_stage, note)
    VALUES (NEW.id, OLD.current_stage, NEW.current_stage, NULL);
    NEW.stage_entered_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meridian_stage_transition
BEFORE UPDATE ON meridian_objects
FOR EACH ROW
EXECUTE FUNCTION meridian_log_stage_transition();

CREATE OR REPLACE FUNCTION meridian_update_issue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meridian_issue_updated
BEFORE UPDATE ON meridian_issues
FOR EACH ROW
EXECUTE FUNCTION meridian_update_issue_timestamp();

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE meridian_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meridian_objects_user_policy" ON meridian_objects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "meridian_issues_user_policy" ON meridian_issues
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "meridian_stage_history_user_policy" ON meridian_stage_history
  FOR ALL USING (
    object_id IN (SELECT id FROM meridian_objects WHERE user_id = auth.uid())
  );
