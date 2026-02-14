-- Add quote column to meetings for LLM-generated contextual quotes
ALTER TABLE meridian_meetings ADD COLUMN IF NOT EXISTS quote text;
