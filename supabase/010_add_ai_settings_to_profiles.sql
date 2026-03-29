-- Add new columns to the profiles table for AI settings
ALTER TABLE profiles
ADD COLUMN ai_service_provider TEXT,
ADD COLUMN ai_api_key TEXT,
ADD COLUMN ai_model TEXT;
