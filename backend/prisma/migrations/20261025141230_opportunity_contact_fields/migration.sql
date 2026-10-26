-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(30);

-- AlterTable
ALTER TABLE "volunteer_opportunities" ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(30);
