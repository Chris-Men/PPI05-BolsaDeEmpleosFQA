-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "user_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_files" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,

    CONSTRAINT "application_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "old_status_id" INTEGER,
    "new_status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "application_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "resume_id" INTEGER,
    "reference_number" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "institution" VARCHAR(150) NOT NULL,
    "degree" VARCHAR(150) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_levels" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "experience_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "organization_id" INTEGER,
    "file_path" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_revisions" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "job_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "employment_type_id" INTEGER NOT NULL,
    "experience_level_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "published_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "municipality" VARCHAR(100) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "organization_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_opportunities" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_registrations" (
    "id" SERIAL NOT NULL,
    "volunteer_opportunity_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "volunteer_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ix_users_status_id" ON "users"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_statuses_name_key" ON "user_statuses"("name");

-- CreateIndex
CREATE INDEX "ix_application_files_application_id" ON "application_files"("application_id");

-- CreateIndex
CREATE INDEX "ix_application_files_file_id" ON "application_files"("file_id");

-- CreateIndex
CREATE INDEX "ix_app_status_history_app_created" ON "application_status_history"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_app_status_history_changed_by" ON "application_status_history"("changed_by");

-- CreateIndex
CREATE UNIQUE INDEX "application_statuses_name_key" ON "application_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_number_key" ON "applications"("reference_number");

-- CreateIndex
CREATE INDEX "ix_applications_resume_id" ON "applications"("resume_id");

-- CreateIndex
CREATE INDEX "ix_applications_status_id" ON "applications"("status_id");

-- CreateIndex
CREATE INDEX "ix_applications_user_id" ON "applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_applications_job_user" ON "applications"("job_id", "user_id");

-- CreateIndex
CREATE INDEX "ix_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ix_audit_logs_user_created" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_educations_user_id" ON "educations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employment_types_name_key" ON "employment_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "experience_levels_name_key" ON "experience_levels"("name");

-- CreateIndex
CREATE INDEX "ix_files_organization_id" ON "files"("organization_id");

-- CreateIndex
CREATE INDEX "ix_files_user_id" ON "files"("user_id");

-- CreateIndex
CREATE INDEX "ix_interviews_application_id" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "ix_interviews_created_by" ON "interviews"("created_by");

-- CreateIndex
CREATE INDEX "ix_interviews_scheduled_at" ON "interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "ix_interviews_status_id" ON "interviews"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_name_key" ON "job_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "ix_job_categories_parent_id" ON "job_categories"("parent_id");

-- CreateIndex
CREATE INDEX "ix_job_revisions_changed_by" ON "job_revisions"("changed_by");

-- CreateIndex
CREATE UNIQUE INDEX "ux_job_revisions_job_revision" ON "job_revisions"("job_id", "revision_number");

-- CreateIndex
CREATE INDEX "ix_job_skills_skill_id" ON "job_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_job_skills_job_skill" ON "job_skills"("job_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_statuses_name_key" ON "job_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "ix_jobs_category_id" ON "jobs"("category_id");

-- CreateIndex
CREATE INDEX "ix_jobs_employment_type_id" ON "jobs"("employment_type_id");

-- CreateIndex
CREATE INDEX "ix_jobs_experience_level_id" ON "jobs"("experience_level_id");

-- CreateIndex
CREATE INDEX "ix_jobs_expires_at" ON "jobs"("expires_at");

-- CreateIndex
CREATE INDEX "ix_jobs_location_id" ON "jobs"("location_id");

-- CreateIndex
CREATE INDEX "ix_jobs_organization_id" ON "jobs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_jobs_published_at" ON "jobs"("published_at");

-- CreateIndex
CREATE INDEX "ix_jobs_status_id" ON "jobs"("status_id");

-- CreateIndex
CREATE INDEX "ix_locations_dept_municip" ON "locations"("department", "municipality");

-- CreateIndex
CREATE INDEX "ix_notifications_user_read" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_statuses_name_key" ON "organization_statuses"("name");

-- CreateIndex
CREATE INDEX "ix_organization_users_user_id" ON "organization_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_organization_users_org_user" ON "organization_users"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "ix_organizations_status_id" ON "organizations"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "ix_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "ix_saved_jobs_job_id" ON "saved_jobs"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_saved_jobs_user_job" ON "saved_jobs"("user_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");

-- CreateIndex
CREATE INDEX "ix_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_user_roles_user_role" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "ix_user_skills_skill_id" ON "user_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_user_skills_user_skill" ON "user_skills"("user_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_opportunities_slug_key" ON "volunteer_opportunities"("slug");

-- CreateIndex
CREATE INDEX "ix_volunteer_opportunities_category_id" ON "volunteer_opportunities"("category_id");

-- CreateIndex
CREATE INDEX "ix_volunteer_opportunities_location_id" ON "volunteer_opportunities"("location_id");

-- CreateIndex
CREATE INDEX "ix_volunteer_opportunities_organization_id" ON "volunteer_opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "ix_volunteer_opportunities_status_id" ON "volunteer_opportunities"("status_id");

-- CreateIndex
CREATE INDEX "ix_volunteer_registrations_user_id" ON "volunteer_registrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_volunteer_registrations_opp_user" ON "volunteer_registrations"("volunteer_opportunity_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_statuses_name_key" ON "volunteer_statuses"("name");

-- CreateIndex
CREATE INDEX "ix_work_experiences_user_id" ON "work_experiences"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_status" FOREIGN KEY ("status_id") REFERENCES "user_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "fk_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_files" ADD CONSTRAINT "fk_app_files_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_files" ADD CONSTRAINT "fk_app_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "fk_app_status_hist_app" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "fk_app_status_hist_user" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_resume" FOREIGN KEY ("resume_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_status" FOREIGN KEY ("status_id") REFERENCES "application_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "fk_educations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "fk_files_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "fk_files_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_status" FOREIGN KEY ("status_id") REFERENCES "application_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "fk_job_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_revisions" ADD CONSTRAINT "fk_job_revisions_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_revisions" ADD CONSTRAINT "fk_job_revisions_user" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_job_skills_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_job_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_category" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_employment_type" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_experience_level" FOREIGN KEY ("experience_level_id") REFERENCES "experience_levels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_status" FOREIGN KEY ("status_id") REFERENCES "job_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "fk_org_users_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "fk_org_users_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "fk_organizations_status" FOREIGN KEY ("status_id") REFERENCES "organization_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "fk_saved_jobs_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "fk_saved_jobs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "fk_user_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "fk_user_skills_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "fk_vol_opp_category" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "fk_vol_opp_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "fk_vol_opp_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "fk_vol_opp_status" FOREIGN KEY ("status_id") REFERENCES "volunteer_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_registrations" ADD CONSTRAINT "fk_vol_reg_opp" FOREIGN KEY ("volunteer_opportunity_id") REFERENCES "volunteer_opportunities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_registrations" ADD CONSTRAINT "fk_vol_reg_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "fk_work_experiences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

