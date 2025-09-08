-- Safe migration for adding NOT NULL columns to tables with existing data
-- This replaces direct ALTER TABLE ADD COLUMN NOT NULL commands

-- Fix users table
DO $$
BEGIN
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(500);
    END IF;
    
    -- Add last_name column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(500);
    END IF;
END $$;

-- Update NULL values before making columns NOT NULL
UPDATE users SET 
    first_name = COALESCE(first_name, 'Unknown'),
    last_name = COALESCE(last_name, 'User')
WHERE first_name IS NULL OR last_name IS NULL;

-- Now safely make columns NOT NULL
ALTER TABLE users 
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL;
