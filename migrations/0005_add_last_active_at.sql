-- Add last_active_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Add last_active_at column to talent_profiles table
ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Set initial last_active_at to created_at for existing users
UPDATE users SET last_active_at = created_at WHERE last_active_at IS NULL;

-- Set initial last_active_at to created_at for existing talent profiles
UPDATE talent_profiles SET last_active_at = created_at WHERE last_active_at IS NULL;
