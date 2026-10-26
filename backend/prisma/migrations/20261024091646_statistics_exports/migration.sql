-- CreateEnum
CREATE TYPE "StatisticsExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "statistics_exports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "request_id" UUID NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "status" "StatisticsExportStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" UUID,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "snapshot_at" TIMESTAMP(3),
    "file_key" UUID,
    "size_bytes" INTEGER,
    "row_counts" JSONB,
    "error" VARCHAR(500),

    CONSTRAINT "statistics_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "statistics_exports_status_next_attempt_at_locked_until_crea_idx" ON "statistics_exports"("status", "next_attempt_at", "locked_until", "created_at");

-- CreateIndex
CREATE INDEX "statistics_exports_user_id_created_at_idx" ON "statistics_exports"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "statistics_exports_user_id_request_id_key" ON "statistics_exports"("user_id", "request_id");

-- AddForeignKey
ALTER TABLE "statistics_exports" ADD CONSTRAINT "statistics_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
