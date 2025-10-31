-- Add benefits field to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT;
