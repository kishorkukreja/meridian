-- Migration: API Tokens for External Issues API
-- Stores hashed API tokens for programmatic access to issues

CREATE TABLE meridian_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,          -- first 8 chars of token for display (e.g. "mrd_ab12...")
  scopes text[] NOT NULL DEFAULT '{}', -- e.g. {'issues:read','issues:write'}
  expires_at timestamptz,              -- NULL = never expires
  revoked_at timestamptz,              -- NULL = active
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for token lookup (hot path on every API request)
CREATE INDEX idx_api_tokens_hash ON meridian_api_tokens(token_hash);

-- Index for listing user's tokens
CREATE INDEX idx_api_tokens_user ON meridian_api_tokens(user_id);

-- Auto-update updated_at
CREATE TRIGGER set_api_tokens_updated_at
  BEFORE UPDATE ON meridian_api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE meridian_api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON meridian_api_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
