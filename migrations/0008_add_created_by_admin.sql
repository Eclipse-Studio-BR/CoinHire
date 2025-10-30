-- Add created_by_admin field to companies table
ALTER TABLE companies ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for faster lookups
CREATE INDEX idx_companies_created_by_admin ON companies(created_by_admin);
