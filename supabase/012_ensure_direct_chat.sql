-- =========================================================================
-- Ensure direct chats are created atomically and reused safely
-- Paste into Supabase SQL Editor
-- =========================================================================

CREATE OR REPLACE FUNCTION public.ensure_direct_chat(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Other user is required';
  END IF;

  IF p_other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot create a direct chat with yourself';
  END IF;

  SELECT c.id
  INTO v_chat_id
  FROM public.chats c
  JOIN public.chat_participants cp_self
    ON cp_self.chat_id = c.id
   AND cp_self.user_id = auth.uid()
  JOIN public.chat_participants cp_other
    ON cp_other.chat_id = c.id
   AND cp_other.user_id = p_other_user_id
  WHERE c.is_group = false
    AND (
      SELECT COUNT(*)
      FROM public.chat_participants cp_count
      WHERE cp_count.chat_id = c.id
    ) = 2
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  INSERT INTO public.chats (is_group, created_by)
  VALUES (false, auth.uid())
  RETURNING id INTO v_chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES
    (v_chat_id, auth.uid()),
    (v_chat_id, p_other_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ensure_direct_chat(UUID) TO authenticated;
