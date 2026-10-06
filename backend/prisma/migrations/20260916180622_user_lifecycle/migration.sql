BEGIN;
-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE VARCHAR(264);


-- Prisma 6 cannot express partial indexes. Keep this database constraint when generating future migrations.
-- https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features
-- Disabled accounts still reserve their email; deleted accounts may repeat it.
CREATE UNIQUE INDEX "users_email_live_key" ON "users"("email") WHERE "deleted_at" IS NULL;

-- Normalize historical soft-deleted rows once; removing exactly one prefix restores their original email.
UPDATE "users" SET "email" = 'inactive.' || "email" WHERE "deleted_at" IS NOT NULL;
COMMIT;
