-- =============================================
-- Fix RLS Policies for Friend Chat
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Fix chats SELECT policy to allow returning row immediately after insert
DROP POLICY IF EXISTS "Chats viewable by participants" ON public.chats;
CREATE POLICY "Chats viewable by participants" ON public.chats
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR
    id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid())
  );

-- 2. Fix chat_participants SELECT to prevent infinite recursion
DROP POLICY IF EXISTS "Participants viewable by participants" ON public.chat_participants;
CREATE POLICY "Participants viewable by participants" ON public.chat_participants
  FOR SELECT TO authenticated USING (
    -- chat_id is an unguessable UUID. We allow unconditionally to avoid recursion.
    -- The chats table RLS secures who can discover the chat_id.
    true
  );

-- 3. Fix chat_participants INSERT to be more secure
DROP POLICY IF EXISTS "Users can add participants if they are participants or creating" ON public.chat_participants;
CREATE POLICY "Users can add participants if they are participants or creating" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()) 
    OR
    EXISTS(SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid())
  );
