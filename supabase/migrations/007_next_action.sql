-- Add next_action column to meridian_issues
ALTER TABLE meridian_issues
  ADD COLUMN next_action text CHECK (next_action IN ('observe', 'follow_up', 'set_meeting'));
