-- Migration script to fix column length issues
-- Run this on your existing database to increase column lengths

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
  ALTER COLUMN api_key TYPE VARCHAR(500),
  ALTER COLUMN billing_type TYPE VARCHAR(50),
  ALTER COLUMN currency TYPE VARCHAR(10),
  ALTER COLUMN stripe_payment_intent_id TYPE VARCHAR(500);

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

-- Update hubspot_connections table
ALTER TABLE hubspot_connections
  ALTER COLUMN portal_id TYPE VARCHAR(500),
  ALTER COLUMN hub_domain TYPE VARCHAR(500),
  ALTER COLUMN account_name TYPE VARCHAR(500);

-- Update actions table (if it exists)
-- Note: actions table already has api_key as VARCHAR(500) in the main script
-- but let's make sure other fields are adequate
ALTER TABLE actions
  ALTER COLUMN name TYPE VARCHAR(500),
  ALTER COLUMN process_name TYPE VARCHAR(500),
  ALTER COLUMN excel_link TYPE VARCHAR(1000),
  ALTER COLUMN message TYPE VARCHAR(2000);
