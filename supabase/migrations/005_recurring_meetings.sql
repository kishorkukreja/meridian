-- ============================================
-- Recurring Meeting Schedule Tracker
-- ============================================

-- Enum: recurrence pattern
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'custom');

-- Table: recurring meeting definitions
CREATE TABLE meridian_recurring_meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  name          text NOT NULL,
  description   text,
  recurrence    recurrence_pattern NOT NULL DEFAULT 'weekly',
  day_of_week   smallint,          -- 0=Sun..6=Sat, used for weekly/biweekly
  day_of_month  smallint,          -- 1-31, used for monthly
  time_of_day   time NOT NULL DEFAULT '09:00',
  duration_minutes smallint NOT NULL DEFAULT 60,
  custom_interval_days smallint,   -- used for custom recurrence
  start_date    date NOT NULL DEFAULT CURRENT_DATE,
  end_date      date,              -- null = no end
  linked_object_ids uuid[] NOT NULL DEFAULT '{}',
  linked_issue_ids  uuid[] NOT NULL DEFAULT '{}',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Table: schedule logs (persisted only on user interaction)
CREATE TABLE meridian_schedule_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id),
  recurring_meeting_id  uuid NOT NULL REFERENCES meridian_recurring_meetings(id) ON DELETE CASCADE,
  occurrence_date       date NOT NULL,
  invite_sent           boolean NOT NULL DEFAULT false,
  attended              boolean NOT NULL DEFAULT false,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_meeting_id, occurrence_date)
);

-- Indexes
CREATE INDEX idx_recurring_meetings_user    ON meridian_recurring_meetings(user_id);
CREATE INDEX idx_recurring_meetings_active  ON meridian_recurring_meetings(user_id, is_active);
CREATE INDEX idx_schedule_logs_user         ON meridian_schedule_logs(user_id);
CREATE INDEX idx_schedule_logs_meeting_date ON meridian_schedule_logs(recurring_meeting_id, occurrence_date);

-- Auto-update triggers (matching existing project pattern)
CREATE OR REPLACE FUNCTION meridian_update_recurring_meeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meridian_recurring_meeting_updated
  BEFORE UPDATE ON meridian_recurring_meetings
  FOR EACH ROW EXECUTE FUNCTION meridian_update_recurring_meeting_timestamp();

CREATE TRIGGER trigger_meridian_schedule_log_updated
  BEFORE UPDATE ON meridian_schedule_logs
  FOR EACH ROW EXECUTE FUNCTION meridian_update_recurring_meeting_timestamp();

-- RLS
ALTER TABLE meridian_recurring_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_schedule_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring meetings"
  ON meridian_recurring_meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own schedule logs"
  ON meridian_schedule_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
