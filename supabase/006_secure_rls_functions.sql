-- =========================================================================
-- Security Definer Functions for Robust, Secure, Non-Recursive RLS Policies
-- Execute in Supabase SQL Editor
-- =========================================================================

-- 1. Helper Functions (SECURITY DEFINER bypasses RLS to avoid recursion)

CREATE OR REPLACE FUNCTION public.user_in_team(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = check_team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.user_in_channel(check_channel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.team_members tm ON tm.team_id = c.team_id
    WHERE c.id = check_channel_id AND tm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.user_in_chat(check_chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = check_chat_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Applying strict isolation to TEAMS using helper functions

DROP POLICY IF EXISTS "Teams viewable by members" ON public.teams;
CREATE POLICY "Teams viewable by members" ON public.teams
  FOR SELECT TO authenticated USING (public.user_in_team(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Team members viewable by team members" ON public.team_members;
CREATE POLICY "Team members viewable by team members" ON public.team_members
  FOR SELECT TO authenticated USING (public.user_in_team(team_id) OR user_id = auth.uid());


-- 3. Applying strict isolation to CHANNELS & MEDIA

DROP POLICY IF EXISTS "Channels viewable by team members" ON public.channels;
CREATE POLICY "Channels viewable by team members" ON public.channels
  FOR SELECT TO authenticated USING (public.user_in_team(team_id));

DROP POLICY IF EXISTS "Messages viewable by team members" ON public.messages;
CREATE POLICY "Messages viewable by team members" ON public.messages
  FOR SELECT TO authenticated USING (public.user_in_channel(channel_id));

DROP POLICY IF EXISTS "Folders viewable by team members" ON public.folders;
CREATE POLICY "Folders viewable by team members" ON public.folders
  FOR SELECT TO authenticated USING (public.user_in_team(team_id));

DROP POLICY IF EXISTS "Notes viewable by team members" ON public.notes;
CREATE POLICY "Notes viewable by team members" ON public.notes
  FOR SELECT TO authenticated USING (public.user_in_team(team_id));


-- 4. Applying strict isolation to CHATS

DROP POLICY IF EXISTS "Chats viewable by participants" ON public.chats;
CREATE POLICY "Chats viewable by participants" ON public.chats
  FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.user_in_chat(id));

DROP POLICY IF EXISTS "Participants viewable by participants" ON public.chat_participants;
CREATE POLICY "Participants viewable by participants" ON public.chat_participants
  FOR SELECT TO authenticated USING (public.user_in_chat(chat_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Messages viewable by participants" ON public.chat_messages;
CREATE POLICY "Messages viewable by participants" ON public.chat_messages
  FOR SELECT TO authenticated USING (public.user_in_chat(chat_id));
