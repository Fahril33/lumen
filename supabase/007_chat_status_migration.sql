-- =========================================================================
-- Refactor Chat Read Receipts to use Message Status Field
-- Run in Supabase SQL Editor
-- =========================================================================

-- 1. Add status column to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent' 
CHECK (status IN ('sent', 'received', 'read'));

-- 2. Create a function to mark incoming messages as 'received' when user comes online
CREATE OR REPLACE FUNCTION public.mark_user_messages_received()
RETURNS void AS $$
BEGIN
  -- Update all active chats where the user is a participant
  UPDATE public.chat_messages
  SET status = 'received', updated_at = now()
  WHERE status = 'sent'
    AND user_id != auth.uid()
    AND chat_id IN (
      SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to mark chat messages as 'read'
CREATE OR REPLACE FUNCTION public.mark_chat_messages_read(p_chat_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chat_messages
  SET status = 'read', updated_at = now()
  WHERE chat_id = p_chat_id
    AND user_id != auth.uid()
    AND status != 'read'
    -- Ensure the user is actually securely in this chat before running
    AND EXISTS (
      SELECT 1 FROM public.chat_participants WHERE chat_id = p_chat_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Optional) We can safely drop the old chat_message_reads table if we don't need it.
-- DROP TABLE IF EXISTS public.chat_message_reads CASCADE;
