-- Add meeting_type column to distinguish full MoM from quick summary
ALTER TABLE meridian_meetings
  ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'full_mom';
