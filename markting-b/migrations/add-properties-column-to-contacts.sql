-- Add properties column to contacts table to store dynamic HubSpot fields
ALTER TABLE contacts ADD COLUMN properties TEXT;
