-- Migration to remove raw_data column from contacts table
-- Run this script in production if synchronize is set to false

-- Remove raw_data column
ALTER TABLE contacts DROP COLUMN IF EXISTS raw_data;

-- Note: user_id column is kept as it's used by the @ManyToOne relationship with @JoinColumn
-- The userId property was removed from the entity but the foreign key column remains
