-- Add new fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS current_size VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_in_crypto BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS remote_working BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS discord VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS telegram VARCHAR(255);
