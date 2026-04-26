-- =====================================================================
-- Migration 014: Enhanced Chat Features
-- Features: Reply, Edit, Delete (soft), Star, Typing (via Presence)
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Add reply_to_id to chat_messages for threaded replies
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- 2. Add is_deleted for soft-delete (message shows "This message was deleted")
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- 3. Starred messages (per-user bookmarks)
--    Junction table so each user can star independently.
CREATE TABLE IF NOT EXISTS public.starred_messages (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stars"
  ON public.starred_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can star messages"
  ON public.starred_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      JOIN public.chat_messages cm ON cm.chat_id = cp.chat_id
      WHERE cp.user_id = auth.uid() AND cm.id = message_id
    )
  );

CREATE POLICY "Users can unstar messages"
  ON public.starred_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. Update the existing UPDATE RLS policy for chat_messages
--    to allow soft-delete (is_deleted) by the message owner
--    The existing policy already allows owner updates, so no change needed.
--    But we add a policy to allow setting is_deleted only by owner:
--    (Already covered by: "Users can edit own messages" policy)

-- 5. Create index for reply lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- 6. Create index for starred message lookups
CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON public.starred_messages(user_id);

-- 7. Add realtime for starred_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
