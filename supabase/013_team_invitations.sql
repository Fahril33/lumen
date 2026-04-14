-- =========================================================================
-- Team invitations
-- Paste into Supabase SQL Editor
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT 'Hi! Ayo gabung timku!',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_invitations_not_self CHECK (inviter_id <> invitee_id),
  CONSTRAINT team_invitations_message_not_blank CHECK (char_length(trim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status
  ON public.team_invitations (team_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status
  ON public.team_invitations (invitee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter_status
  ON public.team_invitations (inviter_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_one_pending_team_user
  ON public.team_invitations (team_id, invitee_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON public.team_invitations;
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team invitations viewable by participants" ON public.team_invitations;
CREATE POLICY "Team invitations viewable by participants" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_id = auth.uid()
    OR public.user_in_team(team_id)
  );

DROP POLICY IF EXISTS "Team members can create invitations" ON public.team_invitations;
CREATE POLICY "Team members can create invitations" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND public.user_in_team(team_id)
  );

DROP POLICY IF EXISTS "Invite recipients can update invitations" ON public.team_invitations;
CREATE POLICY "Invite recipients can update invitations" ON public.team_invitations
  FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_team_id UUID,
  p_invitee_user_id UUID,
  p_message TEXT DEFAULT 'Hi! Ayo gabung timku!'
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_invitee public.profiles%ROWTYPE;
  v_is_friend BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'Team is required';
  END IF;

  IF p_invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'Invitee is required';
  END IF;

  IF auth.uid() = p_invitee_user_id THEN
    RAISE EXCEPTION 'You cannot invite yourself';
  END IF;

  IF NOT public.user_in_team(p_team_id) THEN
    RAISE EXCEPTION 'You are not allowed to invite members to this team';
  END IF;

  SELECT *
  INTO v_invitee
  FROM public.profiles
  WHERE id = p_invitee_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_invitee_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this team';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND recipient_id = p_invitee_user_id)
        OR
        (recipient_id = auth.uid() AND requester_id = p_invitee_user_id)
      )
  )
  INTO v_is_friend;

  IF NOT v_is_friend AND coalesce(v_invitee.allow_anon_chat, false) = false THEN
    RAISE EXCEPTION 'This user is not publicly available for team invitations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_invitations
    WHERE team_id = p_team_id
      AND invitee_id = p_invitee_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this user';
  END IF;

  INSERT INTO public.team_invitations (
    team_id,
    inviter_id,
    invitee_id,
    message
  )
  VALUES (
    p_team_id,
    auth.uid(),
    p_invitee_user_id,
    trim(coalesce(nullif(p_message, ''), 'Hi! Ayo gabung timku!'))
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.respond_to_team_invitation(
  p_invitation_id UUID,
  p_action TEXT
)
RETURNS UUID AS $$
DECLARE
  v_invitation public.team_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported action';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.team_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.invitee_id <> auth.uid() THEN
    RAISE EXCEPTION 'You are not allowed to respond to this invitation';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation has already been handled';
  END IF;

  IF p_action = 'accepted' THEN
    INSERT INTO public.team_members (
      team_id,
      user_id,
      role
    )
    VALUES (
      v_invitation.team_id,
      auth.uid(),
      'member'
    )
    ON CONFLICT (team_id, user_id) DO NOTHING;

    INSERT INTO public.activities (
      team_id,
      user_id,
      type,
      metadata
    )
    VALUES (
      v_invitation.team_id,
      auth.uid(),
      'member_joined',
      jsonb_build_object('role', 'member', 'source', 'team_invitation', 'invitation_id', v_invitation.id)
    );
  END IF;

  UPDATE public.team_invitations
  SET
    status = p_action,
    responded_at = now(),
    updated_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_team_invitation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_team_invitation(UUID, TEXT) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'team_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invitations;
  END IF;
END $$;
