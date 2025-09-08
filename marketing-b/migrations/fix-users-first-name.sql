-- Fix users table first_name column migration
-- This handles the case where first_name column needs to be added or made NOT NULL

-- Step 1: Add the column as nullable first (if it doesn't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(500);

-- Step 2: Update any NULL values with a default value
UPDATE users SET first_name = COALESCE(first_name, 'Unknown') WHERE first_name IS NULL;

-- Step 3: Now make it NOT NULL
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
