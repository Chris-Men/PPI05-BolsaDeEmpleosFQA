-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'UNDISCLOSED');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "sex" "Sex";
