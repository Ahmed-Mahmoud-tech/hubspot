-- Add other_properties column to contacts table for storing additional HubSpot properties
ALTER TABLE contacts 
ADD COLUMN other_properties JSONB;

-- Add index on other_properties for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_other_properties 
ON contacts USING GIN (other_properties);

-- Add comment for documentation
COMMENT ON COLUMN contacts.other_properties IS 'Additional HubSpot properties not in standard fields, stored as JSON';
