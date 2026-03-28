-- =========================================================================
-- Team creation + invite join flow
-- Paste into Supabase SQL Editor
-- =========================================================================

-- Case-insensitive lookup for invite codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code_lower
  ON public.teams (lower(invite_code));

-- Ensure every team has a normalized invite code
UPDATE public.teams
SET invite_code = lower(trim(invite_code))
WHERE invite_code IS NOT NULL
  AND invite_code <> lower(trim(invite_code));

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Team name is required';
  END IF;

  INSERT INTO public.teams (
    name,
    description,
    created_by
  )
  VALUES (
    trim(p_name),
    coalesce(trim(p_description), ''),
    auth.uid()
  )
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (
    team_id,
    user_id,
    role
  )
  VALUES (
    v_team_id,
    auth.uid(),
    'owner'
  )
  ON CONFLICT (team_id, user_id) DO NOTHING;

  INSERT INTO public.channels (
    team_id,
    name,
    description,
    is_default,
    created_by
  )
  VALUES (
    v_team_id,
    'general',
    'General discussion',
    true,
    auth.uid()
  );

  INSERT INTO public.activities (
    team_id,
    user_id,
    type,
    metadata
  )
  VALUES (
    v_team_id,
    auth.uid(),
    'member_joined',
    jsonb_build_object('role', 'owner', 'source', 'team_create')
  );

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.join_team_by_invite_code(
  p_invite_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_team public.teams%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(coalesce(p_invite_code, '')) = '' THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  SELECT *
  INTO v_team
  FROM public.teams
  WHERE lower(invite_code) = lower(trim(p_invite_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = v_team.id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member';
  END IF;

  INSERT INTO public.team_members (
    team_id,
    user_id,
    role
  )
  VALUES (
    v_team.id,
    auth.uid(),
    'member'
  );

  INSERT INTO public.activities (
    team_id,
    user_id,
    type,
    metadata
  )
  VALUES (
    v_team.id,
    auth.uid(),
    'member_joined',
    jsonb_build_object('role', 'member', 'source', 'invite_code')
  );

  RETURN v_team.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_team_with_owner(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_by_invite_code(TEXT) TO authenticated;
