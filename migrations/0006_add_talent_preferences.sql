-- Add new preference fields to talent_profiles table
ALTER TABLE talent_profiles 
ADD COLUMN IF NOT EXISTS preferred_job_types text[],
ADD COLUMN IF NOT EXISTS job_availability varchar(50),
ADD COLUMN IF NOT EXISTS work_flexibility text[];

-- Add comments for documentation
COMMENT ON COLUMN talent_profiles.preferred_job_types IS 'Array of preferred job types: full_time, part_time, contract, internship';
COMMENT ON COLUMN talent_profiles.job_availability IS 'Job availability status: actively_looking, open_to_offers, not_available';
COMMENT ON COLUMN talent_profiles.work_flexibility IS 'Array of work flexibility preferences: onsite, remote';
