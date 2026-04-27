-- =====================================================================
-- Migration 015: Chat Message Reactions (WhatsApp-style)
-- Notes:
-- - Stored on `chat_messages.reactions` as JSONB: { "<emoji>": ["userId1","userId2"], ... }
-- - One reaction per user per message (tap same emoji to remove, tap different to replace)
-- - Uses SECURITY DEFINER function to avoid loosening RLS UPDATE policy
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1) Add reactions column
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2) Toggle reaction RPC
CREATE OR REPLACE FUNCTION public.toggle_chat_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_chat_id UUID;
  v_reactions JSONB;
  v_current_emoji TEXT;
  v_key TEXT;
  v_users JSONB;
  v_emoji TEXT := btrim(p_emoji);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_emoji IS NULL OR v_emoji = '' THEN
    RAISE EXCEPTION 'Emoji is required';
  END IF;

  SELECT chat_id, reactions
    INTO v_chat_id, v_reactions
  FROM public.chat_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE chat_id = v_chat_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Enforce: reactions only for direct (private) chats
  IF EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = v_chat_id
      AND is_group = true
  ) THEN
    RAISE EXCEPTION 'Reactions are only available in direct chats';
  END IF;

  v_reactions := COALESCE(v_reactions, '{}'::jsonb);
  -- Defensive: older/incorrect values might be arrays/scalars; normalize to object
  IF jsonb_typeof(v_reactions) <> 'object' THEN
    v_reactions := '{}'::jsonb;
  END IF;

  -- Find current emoji reacted by this user (if any)
  v_current_emoji := NULL;
  FOR v_key IN SELECT jsonb_object_keys(v_reactions)
  LOOP
    -- Defensive: ensure each key maps to an array of userId strings
    IF jsonb_typeof(v_reactions -> v_key) <> 'array' THEN
      v_reactions := v_reactions - v_key;
      CONTINUE;
    END IF;

    IF (v_reactions -> v_key) ? v_user_id::text THEN
      v_current_emoji := v_key;
      EXIT;
    END IF;
  END LOOP;

  -- Remove user from all emoji arrays (enforces 1 reaction per user)
  FOR v_key IN SELECT jsonb_object_keys(v_reactions)
  LOOP
    IF jsonb_typeof(v_reactions -> v_key) <> 'array' THEN
      v_reactions := v_reactions - v_key;
      CONTINUE;
    END IF;

    v_reactions := jsonb_set(
      v_reactions,
      ARRAY[v_key],
      (
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
        FROM jsonb_array_elements_text(v_reactions -> v_key) AS value
        WHERE value <> v_user_id::text
      ),
      true
    );

    IF jsonb_array_length(v_reactions -> v_key) = 0 THEN
      v_reactions := v_reactions - v_key;
    END IF;
  END LOOP;

  -- Toggle off if same emoji
  IF v_current_emoji = v_emoji THEN
    UPDATE public.chat_messages
    SET reactions = v_reactions,
        updated_at = now()
    WHERE id = p_message_id;

    RETURN v_reactions;
  END IF;

  -- Add user to the selected emoji (deduped)
  v_users := (
    CASE
      WHEN jsonb_typeof(v_reactions -> v_emoji) = 'array' THEN (v_reactions -> v_emoji)
      ELSE '[]'::jsonb
    END
  ) || to_jsonb(v_user_id::text);
  v_users := (
    SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
    FROM jsonb_array_elements_text(v_users) value
  );

  v_reactions := jsonb_set(v_reactions, ARRAY[v_emoji], v_users, true);

  UPDATE public.chat_messages
  SET reactions = v_reactions,
      updated_at = now()
  WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_chat_message_reaction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_chat_message_reaction(UUID, TEXT) TO authenticated;
