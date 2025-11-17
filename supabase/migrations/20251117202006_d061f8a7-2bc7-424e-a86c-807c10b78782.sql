-- Remove the role column from profiles table to prevent privilege escalation
-- Roles are now stored securely in the separate user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;