/*
  Warnings:

  - The primary key for the `admins` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `admin_id` on the `admins` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `attendance_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `attendance_id` on the `attendance_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `audit_id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `daily_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `daily_id` on the `daily_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `final_assessments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `assessments_id` on the `final_assessments` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `industries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `industry_id` on the `industries` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `industry_evaluations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `evaluation_id` on the `industry_evaluations` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `leave_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `leave_id` on the `leave_requests` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `mentors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `mentor_id` on the `mentors` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `placements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `placement_id` on the `placements` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `schools` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `school_id` on the `schools` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `students` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `student_id` on the `students` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `teachers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `teacher_id` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `user_id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `VarChar(17)`.
  - A unique constraint covering the columns `[admin_id]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[attendance_id]` on the table `attendance_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[audit_id]` on the table `audit_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[daily_id]` on the table `daily_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[assessments_id]` on the table `final_assessments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[industry_id]` on the table `industries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[evaluation_id]` on the table `industry_evaluations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leave_id]` on the table `leave_requests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mentor_id]` on the table `mentors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[placement_id]` on the table `placements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id]` on the table `schools` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[student_id]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacher_id]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_school_id_fkey";

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_user_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_placement_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_student_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_attendance_fk";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_leave_fk";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_changed_by_fkey";

-- DropForeignKey
ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "final_assessments" DROP CONSTRAINT "final_assessments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "final_assessments" DROP CONSTRAINT "final_assessments_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "industry_evaluations" DROP CONSTRAINT "industry_evaluations_mentor_id_fkey";

-- DropForeignKey
ALTER TABLE "industry_evaluations" DROP CONSTRAINT "industry_evaluations_placement_id_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_placement_id_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_student_id_fkey";

-- DropForeignKey
ALTER TABLE "mentors" DROP CONSTRAINT "mentors_industry_id_fkey";

-- DropForeignKey
ALTER TABLE "mentors" DROP CONSTRAINT "mentors_user_id_fkey";

-- DropForeignKey
ALTER TABLE "placements" DROP CONSTRAINT "placements_industry_id_fkey";

-- DropForeignKey
ALTER TABLE "placements" DROP CONSTRAINT "placements_student_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_school_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_school_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_fkey";

-- AlterTable
ALTER TABLE "admins" DROP CONSTRAINT "admins_pkey",
ALTER COLUMN "admin_id" DROP DEFAULT,
ALTER COLUMN "admin_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "school_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id");
DROP SEQUENCE "admins_admin_id_seq";

-- AlterTable
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_pkey",
ALTER COLUMN "attendance_id" DROP DEFAULT,
ALTER COLUMN "attendance_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "student_id" SET DATA TYPE TEXT,
ALTER COLUMN "placement_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("attendance_id");
DROP SEQUENCE "attendance_logs_attendance_id_seq";

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
ALTER COLUMN "audit_id" DROP DEFAULT,
ALTER COLUMN "audit_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "target_id" SET DATA TYPE TEXT,
ALTER COLUMN "changed_by" SET DATA TYPE TEXT,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id");
DROP SEQUENCE "audit_logs_audit_id_seq";

-- AlterTable
ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_pkey",
ALTER COLUMN "daily_id" DROP DEFAULT,
ALTER COLUMN "daily_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "attendance_id" SET DATA TYPE TEXT,
ALTER COLUMN "approved_by" SET DATA TYPE TEXT,
ADD CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("daily_id");
DROP SEQUENCE "daily_logs_daily_id_seq";

-- AlterTable
ALTER TABLE "final_assessments" DROP CONSTRAINT "final_assessments_pkey",
ALTER COLUMN "assessments_id" DROP DEFAULT,
ALTER COLUMN "assessments_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "teacher_id" SET DATA TYPE TEXT,
ALTER COLUMN "student_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "final_assessments_pkey" PRIMARY KEY ("assessments_id");
DROP SEQUENCE "final_assessments_assessments_id_seq";

-- AlterTable
ALTER TABLE "industries" DROP CONSTRAINT "industries_pkey",
ALTER COLUMN "industry_id" DROP DEFAULT,
ALTER COLUMN "industry_id" SET DATA TYPE VARCHAR(17),
ADD CONSTRAINT "industries_pkey" PRIMARY KEY ("industry_id");
DROP SEQUENCE "industries_industry_id_seq";

-- AlterTable
ALTER TABLE "industry_evaluations" DROP CONSTRAINT "industry_evaluations_pkey",
ALTER COLUMN "evaluation_id" DROP DEFAULT,
ALTER COLUMN "evaluation_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "mentor_id" SET DATA TYPE TEXT,
ALTER COLUMN "placement_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "industry_evaluations_pkey" PRIMARY KEY ("evaluation_id");
DROP SEQUENCE "industry_evaluations_evaluation_id_seq";

-- AlterTable
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_pkey",
ALTER COLUMN "leave_id" DROP DEFAULT,
ALTER COLUMN "leave_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "student_id" SET DATA TYPE TEXT,
ALTER COLUMN "placement_id" SET DATA TYPE TEXT,
ALTER COLUMN "reviewed_by" SET DATA TYPE TEXT,
ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("leave_id");
DROP SEQUENCE "leave_requests_leave_id_seq";

-- AlterTable
ALTER TABLE "mentors" DROP CONSTRAINT "mentors_pkey",
ALTER COLUMN "mentor_id" DROP DEFAULT,
ALTER COLUMN "mentor_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "industry_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "mentors_pkey" PRIMARY KEY ("mentor_id");
DROP SEQUENCE "mentors_mentor_id_seq";

-- AlterTable
ALTER TABLE "placements" DROP CONSTRAINT "placements_pkey",
ALTER COLUMN "placement_id" DROP DEFAULT,
ALTER COLUMN "placement_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "student_id" SET DATA TYPE TEXT,
ALTER COLUMN "industry_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "placements_pkey" PRIMARY KEY ("placement_id");
DROP SEQUENCE "placements_placement_id_seq";

-- AlterTable
ALTER TABLE "schools" DROP CONSTRAINT "schools_pkey",
ALTER COLUMN "school_id" DROP DEFAULT,
ALTER COLUMN "school_id" SET DATA TYPE VARCHAR(17),
ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("school_id");
DROP SEQUENCE "schools_school_id_seq";

-- AlterTable
ALTER TABLE "students" DROP CONSTRAINT "students_pkey",
ALTER COLUMN "student_id" DROP DEFAULT,
ALTER COLUMN "student_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "school_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_id");
DROP SEQUENCE "students_student_id_seq";

-- AlterTable
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_pkey",
ALTER COLUMN "teacher_id" DROP DEFAULT,
ALTER COLUMN "teacher_id" SET DATA TYPE VARCHAR(17),
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "school_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("teacher_id");
DROP SEQUENCE "teachers_teacher_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "user_id" DROP DEFAULT,
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(17),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");
DROP SEQUENCE "users_user_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "admins_admin_id_key" ON "admins"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_attendance_id_key" ON "attendance_logs"("attendance_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_audit_id_key" ON "audit_logs"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_daily_id_key" ON "daily_logs"("daily_id");

-- CreateIndex
CREATE UNIQUE INDEX "final_assessments_assessments_id_key" ON "final_assessments"("assessments_id");

-- CreateIndex
CREATE UNIQUE INDEX "industries_industry_id_key" ON "industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "industry_evaluations_evaluation_id_key" ON "industry_evaluations"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_leave_id_key" ON "leave_requests"("leave_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_mentor_id_key" ON "mentors"("mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "placements_placement_id_key" ON "placements"("placement_id");

-- CreateIndex
CREATE UNIQUE INDEX "schools_school_id_key" ON "schools"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_id_key" ON "students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_teacher_id_key" ON "teachers"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("placement_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance_logs"("attendance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "mentors"("mentor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("placement_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "mentors"("mentor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_evaluations" ADD CONSTRAINT "industry_evaluations_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("mentor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_evaluations" ADD CONSTRAINT "industry_evaluations_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("placement_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_assessments" ADD CONSTRAINT "final_assessments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_assessments" ADD CONSTRAINT "final_assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "mentors"("mentor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_attendance_fk" FOREIGN KEY ("target_id") REFERENCES "attendance_logs"("attendance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_leave_fk" FOREIGN KEY ("target_id") REFERENCES "leave_requests"("leave_id") ON DELETE RESTRICT ON UPDATE CASCADE;
