-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MENTOR', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PklStatus" AS ENUM ('ACTIVE', 'FINISHED', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('ACTIVE', 'FINISHED', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "GpsStatus" AS ENUM ('VALID', 'WARNING', 'INVALID');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('WFO', 'WFA');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'ALPHA');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'PERSONAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_ALPHA');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING_EVALUATION', 'BLOCKED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "schools" (
    "school_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("school_id")
);

-- CreateTable
CREATE TABLE "admins" (
    "admin_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "school_id" BIGINT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "students" (
    "student_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "nis" BIGINT NOT NULL,
    "school_id" BIGINT NOT NULL,
    "status_pkl" "PklStatus" NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "industries" (
    "industry_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,6) NOT NULL,
    "longitude" DECIMAL(10,6) NOT NULL,
    "radius_meter" INTEGER NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("industry_id")
);

-- CreateTable
CREATE TABLE "mentors" (
    "mentor_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "industry_id" BIGINT NOT NULL,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("mentor_id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "teacher_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "school_id" BIGINT NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "placements" (
    "placement_id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "industry_id" BIGINT NOT NULL,
    "start_date" TIMESTAMPTZ(0) NOT NULL,
    "end_date" TIMESTAMPTZ(0) NOT NULL,
    "status" "PlacementStatus" NOT NULL,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("placement_id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "attendance_id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "placement_id" BIGINT NOT NULL,
    "work_date" DATE NOT NULL,
    "work_type" "WorkType" NOT NULL,
    "check_in_time" TIMESTAMPTZ(0) NOT NULL,
    "check_out_time" TIMESTAMPTZ(0),
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "distance_from_industry" DOUBLE PRECISION,
    "check_in_photo_url" VARCHAR(255) NOT NULL,
    "check_out_photo_url" VARCHAR(255),
    "gps_status" "GpsStatus" NOT NULL,
    "gps_accuracy" DOUBLE PRECISION,
    "gps_attempt_count" INTEGER NOT NULL DEFAULT 1,
    "user_agent" TEXT,
    "status_attendance" "AttendanceStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "daily_id" BIGSERIAL NOT NULL,
    "attendance_id" BIGINT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "processed_text" TEXT,
    "skill_tags" TEXT[],
    "ai_status" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" BIGINT,
    "approved_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("daily_id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "leave_id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "placement_id" BIGINT NOT NULL,
    "leave_date" DATE NOT NULL,
    "type" "LeaveType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "industry_evaluations" (
    "evaluation_id" BIGSERIAL NOT NULL,
    "mentor_id" BIGINT NOT NULL,
    "placement_id" BIGINT NOT NULL,
    "discipline_score" SMALLINT NOT NULL,
    "technical_score" SMALLINT NOT NULL,
    "communication_score" SMALLINT NOT NULL,
    "teamwork_score" SMALLINT NOT NULL,
    "notes" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "industry_evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "final_assessments" (
    "assessments_id" BIGSERIAL NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "final_score" INTEGER NOT NULL,
    "recommendation_status" "RecommendationStatus" NOT NULL,
    "approved_at" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "final_assessments_pkey" PRIMARY KEY ("assessments_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_id" BIGSERIAL NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" BIGINT NOT NULL,
    "changed_by" BIGINT NOT NULL,
    "from_status" VARCHAR(50) NOT NULL,
    "to_status" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_activated_idx" ON "users"("activated");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

-- CreateIndex
CREATE INDEX "admins_school_id_idx" ON "admins"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_nis_key" ON "students"("nis");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "students_status_pkl_idx" ON "students"("status_pkl");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_user_id_key" ON "mentors"("user_id");

-- CreateIndex
CREATE INDEX "mentors_industry_id_idx" ON "mentors"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE INDEX "teachers_school_id_idx" ON "teachers"("school_id");

-- CreateIndex
CREATE INDEX "placements_student_id_idx" ON "placements"("student_id");

-- CreateIndex
CREATE INDEX "placements_industry_id_idx" ON "placements"("industry_id");

-- CreateIndex
CREATE INDEX "placements_status_idx" ON "placements"("status");

-- CreateIndex
CREATE INDEX "placements_start_date_end_date_idx" ON "placements"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "attendance_logs_student_id_idx" ON "attendance_logs"("student_id");

-- CreateIndex
CREATE INDEX "attendance_logs_work_date_idx" ON "attendance_logs"("work_date");

-- CreateIndex
CREATE INDEX "attendance_logs_status_attendance_idx" ON "attendance_logs"("status_attendance");

-- CreateIndex
CREATE INDEX "attendance_logs_gps_status_idx" ON "attendance_logs"("gps_status");

-- CreateIndex
CREATE INDEX "attendance_logs_work_type_idx" ON "attendance_logs"("work_type");

-- CreateIndex
CREATE INDEX "attendance_logs_created_at_idx" ON "attendance_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_placement_id_work_date_key" ON "attendance_logs"("placement_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_attendance_id_key" ON "daily_logs"("attendance_id");

-- CreateIndex
CREATE INDEX "daily_logs_ai_status_idx" ON "daily_logs"("ai_status");

-- CreateIndex
CREATE INDEX "daily_logs_approval_status_idx" ON "daily_logs"("approval_status");

-- CreateIndex
CREATE INDEX "daily_logs_approved_by_idx" ON "daily_logs"("approved_by");

-- CreateIndex
CREATE INDEX "daily_logs_created_at_idx" ON "daily_logs"("created_at");

-- CreateIndex
CREATE INDEX "daily_logs_approval_status_ai_status_idx" ON "daily_logs"("approval_status", "ai_status");

-- CreateIndex
CREATE INDEX "leave_requests_student_id_idx" ON "leave_requests"("student_id");

-- CreateIndex
CREATE INDEX "leave_requests_placement_id_idx" ON "leave_requests"("placement_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_leave_date_idx" ON "leave_requests"("leave_date");

-- CreateIndex
CREATE INDEX "leave_requests_reviewed_by_idx" ON "leave_requests"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_placement_id_leave_date_key" ON "leave_requests"("placement_id", "leave_date");

-- CreateIndex
CREATE INDEX "industry_evaluations_mentor_id_idx" ON "industry_evaluations"("mentor_id");

-- CreateIndex
CREATE INDEX "industry_evaluations_placement_id_idx" ON "industry_evaluations"("placement_id");

-- CreateIndex
CREATE INDEX "industry_evaluations_submitted_at_idx" ON "industry_evaluations"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "industry_evaluations_mentor_id_placement_id_key" ON "industry_evaluations"("mentor_id", "placement_id");

-- CreateIndex
CREATE UNIQUE INDEX "final_assessments_student_id_key" ON "final_assessments"("student_id");

-- CreateIndex
CREATE INDEX "final_assessments_teacher_id_idx" ON "final_assessments"("teacher_id");

-- CreateIndex
CREATE INDEX "final_assessments_recommendation_status_idx" ON "final_assessments"("recommendation_status");

-- CreateIndex
CREATE INDEX "final_assessments_approved_at_idx" ON "final_assessments"("approved_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_changed_by_idx" ON "audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "audit_logs_changed_at_idx" ON "audit_logs"("changed_at");

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
