-- Add linked_object_ids array column to meridian_issues
-- Primary object remains object_id (required FK); these are optional secondary links
ALTER TABLE meridian_issues
  ADD COLUMN linked_object_ids uuid[] NOT NULL DEFAULT '{}';
