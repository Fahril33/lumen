-- =========================================================================
-- Chat Requests + Intro Message Support
-- Paste this in Supabase SQL Editor before using the new chat request UI
-- =========================================================================

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS message_kind TEXT NOT NULL DEFAULT 'standard'
CHECK (message_kind IN ('standard', 'request_intro'));

CREATE TABLE IF NOT EXISTS public.chat_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initial_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_requests_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT chat_requests_message_not_blank CHECK (char_length(trim(initial_message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_recipient_status
  ON public.chat_requests (recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_status
  ON public.chat_requests (sender_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_one_pending_pair
  ON public.chat_requests (sender_id, recipient_id)
  WHERE status = 'pending';

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES public.chat_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_related_request_id
  ON public.chat_messages (related_request_id);

DROP TRIGGER IF EXISTS update_chat_requests_updated_at ON public.chat_requests;
CREATE TRIGGER update_chat_requests_updated_at
  BEFORE UPDATE ON public.chat_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat requests viewable by participants" ON public.chat_requests;
CREATE POLICY "Chat requests viewable by participants" ON public.chat_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create own chat requests" ON public.chat_requests;
CREATE POLICY "Users can create own chat requests" ON public.chat_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can respond to chat requests" ON public.chat_requests;
CREATE POLICY "Recipients can respond to chat requests" ON public.chat_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE OR REPLACE FUNCTION public.create_chat_request(
  p_recipient_username TEXT,
  p_initial_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_recipient public.profiles%ROWTYPE;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(coalesce(p_recipient_username, '')) = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF trim(coalesce(p_initial_message, '')) = '' THEN
    RAISE EXCEPTION 'Initial message is required';
  END IF;

  SELECT *
  INTO v_recipient
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_recipient_username))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_recipient.id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot send a chat request to yourself';
  END IF;

  IF coalesce(v_recipient.allow_anon_chat, false) = false THEN
    RAISE EXCEPTION 'This user is not accepting new chat requests';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chat_requests
    WHERE sender_id = auth.uid()
      AND recipient_id = v_recipient.id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending chat request already exists';
  END IF;

  INSERT INTO public.chat_requests (sender_id, recipient_id, initial_message)
  VALUES (auth.uid(), v_recipient.id, trim(p_initial_message))
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.accept_chat_request(p_request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request public.chat_requests%ROWTYPE;
  v_chat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_request
  FROM public.chat_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat request not found';
  END IF;

  IF v_request.recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'You are not allowed to accept this request';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been handled';
  END IF;

  SELECT cp_self.chat_id
  INTO v_chat_id
  FROM public.chat_participants cp_self
  JOIN public.chat_participants cp_sender
    ON cp_sender.chat_id = cp_self.chat_id
   AND cp_sender.user_id = v_request.sender_id
  JOIN public.chats c
    ON c.id = cp_self.chat_id
  WHERE cp_self.user_id = v_request.recipient_id
    AND c.is_group = false
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (is_group, created_by)
    VALUES (false, auth.uid())
    RETURNING id INTO v_chat_id;

    INSERT INTO public.chat_participants (chat_id, user_id)
    VALUES
      (v_chat_id, v_request.sender_id),
      (v_chat_id, v_request.recipient_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.chat_messages (
    chat_id,
    user_id,
    content,
    status,
    message_kind,
    related_request_id
  )
  VALUES (
    v_chat_id,
    v_request.sender_id,
    v_request.initial_message,
    'sent',
    'request_intro',
    v_request.id
  );

  UPDATE public.chat_requests
  SET
    status = 'accepted',
    chat_id = v_chat_id,
    responded_at = now(),
    updated_at = now()
  WHERE id = v_request.id;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
  END IF;
END $$;
