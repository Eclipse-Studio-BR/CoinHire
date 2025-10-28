-- Add resume_path column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resume_path" varchar(500);
