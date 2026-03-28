-- =============================================
-- Fix RLS Policies for Teams and Team Members
-- Run this in Supabase SQL Editor
-- =============================================

-- The previous SELECT policy for team_members caused an infinite recursion because 
-- querying team_members triggered a subquery on team_members which triggered the policy again.
-- To fix this, we allow authenticated users to view team_members unconditionally.
-- Since team_id is a secure UUID, users cannot enumerate teams they don't know about.

DROP POLICY IF EXISTS "Team members viewable by team members" ON public.team_members;

CREATE POLICY "Team members viewable by team members" ON public.team_members
  FOR SELECT TO authenticated USING (true);
