-- One-time data-preserving bridge from the legacy email/password recovery branch.
-- The generated Prisma diff drops requested_at and consumed_at, losing the
-- five-minute request history and token consumption state. Rename them instead.
-- Run only against a backed-up database with the API stopped. Follow with
-- prisma migrate resolve for the two equivalent migrations, then remove the
-- superseded legacy row from _prisma_migrations as documented in SETUP.md.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM _prisma_migrations
    WHERE migration_name = '20260929063215_email_password_recovery'
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy recovery migration is not applied';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _prisma_migrations
    WHERE migration_name IN (
      '20260929193125_add_password_reset_tokens',
      '20261001083439_email_outbox'
    ) AND finished_at IS NOT NULL AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target migrations are already applied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      AND column_name = 'requested_at'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      AND column_name = 'consumed_at'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Unexpected password_reset_tokens structure';
  END IF;
END $$;

ALTER TABLE password_reset_tokens RENAME COLUMN requested_at TO created_at;
ALTER TABLE password_reset_tokens RENAME COLUMN consumed_at TO used_at;
ALTER TABLE password_reset_tokens ALTER COLUMN created_at TYPE TIMESTAMP(6);
ALTER TABLE password_reset_tokens ALTER COLUMN used_at TYPE TIMESTAMP(6);
ALTER TABLE password_reset_tokens ALTER COLUMN expires_at TYPE TIMESTAMP(6);
ALTER TABLE password_reset_tokens ADD COLUMN id SERIAL NOT NULL;
ALTER TABLE password_reset_tokens DROP CONSTRAINT password_reset_tokens_pkey;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

COMMIT;
