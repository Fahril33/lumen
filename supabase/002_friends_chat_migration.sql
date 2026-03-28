-- =============================================
-- Migration: Add Friend System and Global Chat
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Modify Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_anon_chat BOOLEAN DEFAULT true;

-- Function to auto-generate username for existing profiles
CREATE OR REPLACE FUNCTION public.generate_username_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 0, 5);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_or_updated
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_username_trigger();

-- Backfill existing profiles
UPDATE public.profiles SET username = split_part(email, '@', 1) || '_' || substr(md5(random()::text), 0, 5) WHERE username IS NULL;

-- 2. Friendships
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Friendships are viewable by participants" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they are part of" ON public.friendships
  FOR UPDATE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- 3. Chats (1-on-1 and Group)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_group BOOLEAN DEFAULT false,
  name TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.chat_participants (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper function for Chat RLS
CREATE OR REPLACE FUNCTION public.user_in_chat(check_chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = check_chat_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for Chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chats viewable by participants" ON public.chats
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR public.user_in_chat(id)
  );
CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Participants can update group chat" ON public.chats
  FOR UPDATE TO authenticated USING (
    id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid())
  );

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by participants" ON public.chat_participants
  FOR SELECT TO authenticated USING (
    public.user_in_chat(chat_id) OR user_id = auth.uid()
  );
CREATE POLICY "Users can add participants if they are participants or creating" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()) 
    OR
    EXISTS(SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid())
  );

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by participants" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    public.user_in_chat(chat_id)
  );
CREATE POLICY "Participants can send messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND 
    chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can edit own messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Message Read Receipts for new chats
CREATE TABLE public.chat_message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own read receipts in chats" ON public.chat_message_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own read receipts in chats" ON public.chat_message_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own read receipts in chats" ON public.chat_message_reads
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Realtime settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
