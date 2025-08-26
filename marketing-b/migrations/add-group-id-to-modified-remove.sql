-- Add group_id column to modified table as nullable first
ALTER TABLE modified ADD COLUMN group_id INTEGER NULL;

-- Add group_id column to remove table as nullable first
ALTER TABLE remove ADD COLUMN group_id INTEGER NULL;

-- Optional: Update existing records with a default group_id if needed
-- UPDATE modified SET group_id = -1 WHERE group_id IS NULL;
-- UPDATE remove SET group_id = -1 WHERE group_id IS NULL;

-- Optional: Make columns NOT NULL after updating existing records
-- ALTER TABLE modified ALTER COLUMN group_id SET NOT NULL;
-- ALTER TABLE remove ALTER COLUMN group_id SET NOT NULL;
