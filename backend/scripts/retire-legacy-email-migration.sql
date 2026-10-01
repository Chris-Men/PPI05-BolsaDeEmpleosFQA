-- Remove the superseded combined migration only after Prisma has recorded
-- the two equivalent migrations from this branch as applied. A full pg_dump
-- must already exist. This direct metadata edit is necessary because Prisma
-- migrate resolve cannot remove an applied migration absent from this branch.
BEGIN;

DO $$
DECLARE
  target_count integer;
  legacy_count integer;
BEGIN
  SELECT count(*) INTO target_count
  FROM _prisma_migrations
  WHERE migration_name IN (
    '20260929193125_add_password_reset_tokens',
    '20261001083439_email_outbox'
  ) AND finished_at IS NOT NULL AND rolled_back_at IS NULL;
  IF target_count <> 2 THEN
    RAISE EXCEPTION 'Both target migrations must be marked applied first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      AND column_name = 'id'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      AND column_name = 'requested_at'
  ) OR to_regclass('public.email_outbox') IS NULL THEN
    RAISE EXCEPTION 'Target schema is not present';
  END IF;

  DELETE FROM _prisma_migrations
  WHERE migration_name = '20260929063215_email_password_recovery'
    AND finished_at IS NOT NULL AND rolled_back_at IS NULL;
  GET DIAGNOSTICS legacy_count = ROW_COUNT;
  IF legacy_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one applied legacy migration';
  END IF;
END $$;

COMMIT;
