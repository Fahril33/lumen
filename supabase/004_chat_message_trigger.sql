-- =============================================
-- Trigger to update chats.updated_at
-- Run this in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION public.update_chat_updated_at_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_inserted ON public.chat_messages;
CREATE TRIGGER on_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_on_message();
