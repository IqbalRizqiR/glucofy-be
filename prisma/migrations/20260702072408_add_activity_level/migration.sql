-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE');

-- AlterTable
ALTER TABLE "health_profiles" ADD COLUMN     "activity_level" "ActivityLevel";
