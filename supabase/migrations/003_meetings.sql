-- Migration: Minutes of Meeting (MoM) feature
-- Creates meridian_meetings table for storing AI-generated meeting summaries

CREATE TABLE meridian_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  transcript TEXT NOT NULL,
  tldr TEXT,
  discussion_points JSONB,
  next_steps JSONB,
  action_log TEXT,
  model_used TEXT,
  linked_object_ids UUID[] DEFAULT '{}',
  linked_issue_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meetings_user ON meridian_meetings(user_id);
CREATE INDEX idx_meetings_date ON meridian_meetings(meeting_date DESC);

ALTER TABLE meridian_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meetings"
  ON meridian_meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
