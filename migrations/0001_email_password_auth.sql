CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add username and password hash columns required for local auth
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

-- Ensure existing rows have a placeholder password hash and email
UPDATE "users"
SET "password_hash" = COALESCE(
  "password_hash",
  'legacy:' || encode(gen_random_bytes(32), 'hex')
);

UPDATE "users"
SET "email" = CONCAT('user+', "id", '@placeholder.local')
WHERE "email" IS NULL;

-- Enforce constraints for the new auth model
ALTER TABLE "users"
  ALTER COLUMN "password_hash" SET NOT NULL,
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "role" SET DEFAULT 'guest';

-- Apply uniqueness to username if present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
  END IF;
END $$;

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");
