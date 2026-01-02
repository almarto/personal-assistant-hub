-- Rename caregivers table to baby_shares
ALTER TABLE caregivers RENAME TO baby_shares;

-- Add role column and drop permission_level
ALTER TABLE baby_shares 
    ADD COLUMN role VARCHAR(20) CHECK (role IN ('parent', 'caregiver'));

-- Migrate existing data (default to 'caregiver' if any exists)
UPDATE baby_shares SET role = 'caregiver' WHERE role IS NULL;

-- Make role required and drop old column
ALTER TABLE baby_shares 
    ALTER COLUMN role SET NOT NULL,
    DROP COLUMN permission_level;

-- Ensure indexes are renamed/created (Indexes on renamed tables are usually preserved but named with old table name)
-- We can optionally rename indexes for clarity
ALTER INDEX IF EXISTS idx_caregivers_baby_id RENAME TO idx_baby_shares_baby_id;
ALTER INDEX IF EXISTS idx_caregivers_user_id RENAME TO idx_baby_shares_user_id;
