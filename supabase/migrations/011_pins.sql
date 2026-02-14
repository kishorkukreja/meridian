-- Pinned/Favorites table
CREATE TABLE meridian_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('object', 'issue')),
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE meridian_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pins"
  ON meridian_pins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
