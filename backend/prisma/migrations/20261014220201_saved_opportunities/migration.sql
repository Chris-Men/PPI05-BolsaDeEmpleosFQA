-- CreateTable
CREATE TABLE "saved_volunteer_opportunities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "volunteer_opportunity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_volunteer_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_saved_volunteer_user_date_id" ON "saved_volunteer_opportunities"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "ix_saved_volunteer_opportunity" ON "saved_volunteer_opportunities"("volunteer_opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_saved_volunteer_user_opportunity" ON "saved_volunteer_opportunities"("user_id", "volunteer_opportunity_id");

-- CreateIndex
CREATE INDEX "ix_saved_jobs_user_date_id" ON "saved_jobs"("user_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "saved_volunteer_opportunities" ADD CONSTRAINT "saved_volunteer_opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_volunteer_opportunities" ADD CONSTRAINT "saved_volunteer_opportunities_volunteer_opportunity_id_fkey" FOREIGN KEY ("volunteer_opportunity_id") REFERENCES "volunteer_opportunities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
