-- Add merged_at timestamp column to matching table
ALTER TABLE matching ADD COLUMN merged_at TIMESTAMP NULL;

-- Add comment explaining the column
COMMENT ON COLUMN matching.merged_at IS 'Timestamp when the matching group was merged in HubSpot';
