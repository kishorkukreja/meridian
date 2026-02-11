-- Migration: Add comments table for objects and issues
-- Run this in Supabase SQL Editor or push via CLI

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
