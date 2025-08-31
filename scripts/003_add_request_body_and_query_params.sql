-- Add request body and query params columns to endpoints
ALTER TABLE endpoints
  ADD COLUMN IF NOT EXISTS request_body JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS query_params JSONB DEFAULT '{}'::jsonb;

