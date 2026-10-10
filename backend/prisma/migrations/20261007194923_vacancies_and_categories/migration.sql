-- CreateEnum
CREATE TYPE "OpportunityKind" AS ENUM ('EMPLOYMENT', 'INTERNSHIP', 'SOCIAL_HOURS');

-- CreateEnum
CREATE TYPE "WorkModality" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- AlterTable
ALTER TABLE "job_categories" ADD COLUMN     "description" VARCHAR(1000),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "archived_at" TIMESTAMP(6),
ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contact" VARCHAR(255),
ADD COLUMN     "duration" VARCHAR(120),
ADD COLUMN     "kind" "OpportunityKind" NOT NULL DEFAULT 'EMPLOYMENT',
ADD COLUMN     "modality" "WorkModality" NOT NULL DEFAULT 'ON_SITE',
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salary_max" DECIMAL(10,2),
ADD COLUMN     "salary_min" DECIMAL(10,2),
ADD COLUMN     "slots" INTEGER,
ADD COLUMN     "social_hours" INTEGER,
ALTER COLUMN "organization_id" DROP NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL,
ALTER COLUMN "employment_type_id" DROP NOT NULL,
ALTER COLUMN "experience_level_id" DROP NOT NULL,
ALTER COLUMN "location_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "volunteer_opportunities" ADD COLUMN     "archived_at" TIMESTAMP(6),
ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contact" VARCHAR(255),
ADD COLUMN     "expires_at" TIMESTAMP(6),
ADD COLUMN     "modality" "WorkModality" NOT NULL DEFAULT 'ON_SITE',
ADD COLUMN     "published_at" TIMESTAMP(6),
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "slots" INTEGER,
ALTER COLUMN "organization_id" DROP NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL,
ALTER COLUMN "location_id" DROP NOT NULL;
