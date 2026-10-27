-- Google sign-in with the API's own session: users are keyed by Google's
-- subject (an existing row relinks by email on its next sign-in), and a
-- finished Google login leaves a one-time handoff the browser redeems for
-- its session token.
ALTER TABLE app_user RENAME COLUMN firebase_uid TO google_sub;
ALTER TABLE app_user RENAME CONSTRAINT app_user_firebase_uid_key TO app_user_google_sub_key;

-- Only hashes of the two codes are stored. The first redeem seals the issued
-- token so a retry inside the replay window returns the same session.
CREATE TABLE sso_handoff (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body_code_hash    text NOT NULL UNIQUE,
  cookie_code_hash  text NOT NULL UNIQUE,
  user_id           uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  challenge         text NOT NULL DEFAULT '',
  channel           text NOT NULL DEFAULT '' CHECK (channel IN ('', 'body', 'cookie')),
  token_ciphertext  bytea,
  consumed_at       timestamptz,
  expires_at        timestamptz NOT NULL
);
CREATE INDEX sso_handoff_expires ON sso_handoff (expires_at);
