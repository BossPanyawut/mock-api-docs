-- Add description field to endpoints table
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing endpoints to have a default description if needed
UPDATE endpoints SET description = name WHERE description IS NULL;
