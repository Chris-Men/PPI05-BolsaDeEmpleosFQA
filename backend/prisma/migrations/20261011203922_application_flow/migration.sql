/*
  Warnings:

  - A unique constraint covering the columns `[submission_key]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[job_id,user_id,attempt_number]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[volunteer_registration_id,attempt_number]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[event_key]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ux_applications_job_user";

-- AlterTable
ALTER TABLE "application_status_history" ADD COLUMN     "reason" VARCHAR(2000);

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "opportunity_snapshot" JSONB,
ADD COLUMN     "profile_snapshot" JSONB,
ADD COLUMN     "submission_key" UUID,
ADD COLUMN     "submitted_data" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "volunteer_registration_id" INTEGER,
ALTER COLUMN "job_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "application_id" INTEGER,
ADD COLUMN     "event_key" VARCHAR(160);

-- CreateTable
CREATE TABLE "application_drafts" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "volunteer_opportunity_id" INTEGER,
    "resume_id" INTEGER,
    "data" JSONB NOT NULL,
    "profile_snapshot" JSONB,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_drafts_user_id_job_id_key" ON "application_drafts"("user_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_drafts_user_id_volunteer_opportunity_id_key" ON "application_drafts"("user_id", "volunteer_opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_submission_key_key" ON "applications"("submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "ux_applications_job_user_attempt" ON "applications"("job_id", "user_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "ux_applications_volunteer_attempt" ON "applications"("volunteer_registration_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_volunteer_registration_id_fkey" FOREIGN KEY ("volunteer_registration_id") REFERENCES "volunteer_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_volunteer_opportunity_id_fkey" FOREIGN KEY ("volunteer_opportunity_id") REFERENCES "volunteer_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
