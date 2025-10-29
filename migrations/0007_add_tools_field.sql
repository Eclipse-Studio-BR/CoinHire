-- Add tools field to talent_profiles table
ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS tools text[];
