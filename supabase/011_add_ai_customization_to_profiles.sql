-- Add new columns to the profiles table for AI customization
ALTER TABLE profiles
ADD COLUMN ai_custom_instructions TEXT,
ADD COLUMN ai_language TEXT;
