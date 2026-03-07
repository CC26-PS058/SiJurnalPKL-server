/*
  Warnings:

  - Added the required column `work_hour_type` to the `industries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkHourType" AS ENUM ('FIXED_SHIFT', 'MINIMUM_HOURS');

-- AlterTable
ALTER TABLE "industries" ADD COLUMN     "fixed_check_in_time" VARCHAR(5),
ADD COLUMN     "fixed_check_out_time" VARCHAR(5),
ADD COLUMN     "minimum_hours" INTEGER,
ADD COLUMN     "work_hour_type" "WorkHourType" NOT NULL;
