/*
  Warnings:

  - A unique constraint covering the columns `[resume_file_id]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "files" ADD COLUMN     "mime_type" VARCHAR(100),
ADD COLUMN     "original_name" VARCHAR(255),
ADD COLUMN     "size_bytes" INTEGER;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "education_level" VARCHAR(100),
ADD COLUMN     "municipality" VARCHAR(100),
ADD COLUMN     "profession" VARCHAR(150),
ADD COLUMN     "professional_summary" VARCHAR(5000),
ADD COLUMN     "resume_file_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_resume_file_id_key" ON "user_profiles"("resume_file_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_resume_file_id_fkey" FOREIGN KEY ("resume_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
