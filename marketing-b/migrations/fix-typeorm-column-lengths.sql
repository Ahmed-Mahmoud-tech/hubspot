-- Migration to fix column length constraints in TypeORM entities
-- Run this if synchronize is disabled or in production

-- Update contacts table
ALTER TABLE contacts 
  ALTER COLUMN hubspot_id TYPE VARCHAR(500),
  ALTER COLUMN email TYPE VARCHAR(500),
  ALTER COLUMN first_name TYPE VARCHAR(500),
  ALTER COLUMN last_name TYPE VARCHAR(500),
  ALTER COLUMN company TYPE TEXT,
  ALTER COLUMN api_key TYPE VARCHAR(500);

-- Update users table  
ALTER TABLE users
  ALTER COLUMN first_name TYPE VARCHAR(500),
  ALTER COLUMN last_name TYPE VARCHAR(500),
  ALTER COLUMN email TYPE VARCHAR(500),
  ALTER COLUMN phone TYPE VARCHAR(50),
  ALTER COLUMN password TYPE VARCHAR(500),
  ALTER COLUMN verification_token TYPE VARCHAR(500),
  ALTER COLUMN reset_password_token TYPE VARCHAR(500);

-- Update payments table
ALTER TABLE payments
  ALTER COLUMN billing_type TYPE VARCHAR(50);

-- Update matching table
ALTER TABLE matching
  ALTER COLUMN api_key TYPE VARCHAR(500);

-- Update merging table  
ALTER TABLE merging
  ALTER COLUMN api_key TYPE VARCHAR(500),
  ALTER COLUMN primary_account_id TYPE VARCHAR(500),
  ALTER COLUMN secondary_account_id TYPE VARCHAR(500);

-- Update modified table
ALTER TABLE modified
  ALTER COLUMN api_key TYPE VARCHAR(500);

-- Update remove table
ALTER TABLE remove
  ALTER COLUMN api_key TYPE VARCHAR(500);
