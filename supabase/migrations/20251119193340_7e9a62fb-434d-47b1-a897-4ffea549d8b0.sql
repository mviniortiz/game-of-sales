-- Fix critical security vulnerability in user_conquistas table
-- Drop the overly permissive policy that allows any user to insert achievements
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_conquistas;

-- Create a new policy that only allows admins to grant achievements
CREATE POLICY "Only admins can grant achievements"
ON public.user_conquistas
FOR INSERT
WITH CHECK (is_admin(auth.uid()));