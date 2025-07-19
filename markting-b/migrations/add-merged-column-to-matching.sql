-- Add merged column to matching table with default value false
ALTER TABLE matching ADD COLUMN merged BOOLEAN DEFAULT FALSE;

-- Update any existing records to have merged = false (should already be the default)
UPDATE matching SET merged = FALSE WHERE merged IS NULL;
