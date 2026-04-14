import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile, Team, TeamInvitation } from '@/types/database'

export type TeamInvitationWithRelations = TeamInvitation & {
  inviter?: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'>
  invitee?: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'>
  team?: Pick<Team, 'id' | 'name' | 'invite_code' | 'avatar_url'>
}

const TEAM_INVITATION_SELECT = `
  *,
  inviter:profiles!inviter_id(id, full_name, username, avatar_url),
  invitee:profiles!invitee_id(id, full_name, username, avatar_url),
  team:teams(id, name, invite_code, avatar_url)
`

export function useTeamInvitations(teamId: string | undefined) {
  const queryClient = useQueryClient()

  const invitationsQuery = useQuery({
    queryKey: ['team-invitations', teamId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('team_invitations') as any)
        .select(TEAM_INVITATION_SELECT)
        .eq('team_id', teamId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as TeamInvitationWithRelations[]
    },
    enabled: !!teamId,
  })

  useEffect(() => {
    if (!teamId) return

    const channel = supabase
      .channel(`team-invitations:${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_invitations', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient, teamId])

  const createInvitationMutation = useMutation({
    mutationFn: async ({ inviteeUserId, message }: { inviteeUserId: string; message: string }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.rpc as any)('create_team_invitation', {
        p_team_id: teamId,
        p_invitee_user_id: inviteeUserId,
        p_message: message,
      })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] })
      toast.success('Invitation sent')
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  return {
    invitationsQuery,
    createInvitationMutation,
  }
}

export function useIncomingTeamInvitations() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const invitationsQuery = useQuery({
    queryKey: ['incoming-team-invitations', user?.id],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('team_invitations') as any)
        .select(TEAM_INVITATION_SELECT)
        .eq('invitee_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as TeamInvitationWithRelations[]
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`incoming-team-invitations:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations' }, (payload) => {
        const nextRow = payload.new as Partial<TeamInvitation>
        const prevRow = payload.old as Partial<TeamInvitation>
        const isRelated =
          nextRow.invitee_id === user.id ||
          nextRow.inviter_id === user.id ||
          prevRow.invitee_id === user.id ||
          prevRow.inviter_id === user.id

        if (!isRelated) return

        queryClient.invalidateQueries({ queryKey: ['incoming-team-invitations', user.id] })
        queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
        queryClient.invalidateQueries({ queryKey: ['teams', user.id] })
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient, user])

  return { invitationsQuery }
}

export function useRespondToTeamInvitation() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const respondToTeamInvitationMutation = useMutation({
    mutationFn: async ({
      invitationId,
      action,
    }: {
      invitationId: string
      action: 'accepted' | 'rejected'
    }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.rpc as any)('respond_to_team_invitation', {
        p_invitation_id: invitationId,
        p_action: action,
      })

      if (error) throw error
      return data as string | null
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['incoming-team-invitations', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['team-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['teams', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
      ])

      toast.success(
        variables.action === 'accepted' ? 'Team invitation accepted' : 'Team invitation rejected'
      )
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  return { respondToTeamInvitationMutation }
}
