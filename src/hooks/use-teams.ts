import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'
import type { Team } from '@/types/database'
import { toast } from 'sonner'

export function useTeams() {
  const user = useAuthStore((s) => s.user)
  const { setTeams, setCurrentTeam, addTeam } = useTeamStore()

  const teamsQuery = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('team_members') as any)
        .select('team_id, teams(*)')
        .eq('user_id', user!.id)
      if (error) throw error
      const teams = (data ?? [])
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        .map((tm: any) => tm.teams)
        .filter(Boolean) as Team[]
      setTeams(teams)
      return teams
    },
    enabled: !!user,
  })

  const queryClient = useQueryClient()

  const createTeamMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: team, error } = await (supabase.from('teams') as any)
        .insert({ name, description: description ?? '', created_by: user!.id })
        .select()
        .single()
      if (error) throw error

      // Add creator as owner
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      await (supabase.from('team_members') as any).insert({
        team_id: team.id,
        user_id: user!.id,
        role: 'owner',
      })

      // Create default channel
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      await (supabase.from('channels') as any).insert({
        team_id: team.id,
        name: 'general',
        description: 'General discussion',
        is_default: true,
        created_by: user!.id,
      })

      return team
    },
    onSuccess: (team) => {
      addTeam(team)
      setCurrentTeam(team)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team created successfully!')
    },
    onError: (err) => {
      toast.error('Failed to create team: ' + (err as Error).message)
    },
  })

  const joinTeamMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: team, error: teamError } = await (supabase.from('teams') as any)
        .select('*')
        .eq('invite_code', inviteCode)
        .single()
      if (teamError) throw new Error('Invalid invite code')

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('team_members') as any).insert({
        team_id: team.id,
        user_id: user!.id,
        role: 'member',
      })
      if (error) {
        if (error.code === '23505') throw new Error('You are already a member')
        throw error
      }
      return team
    },
    onSuccess: (team) => {
      addTeam(team)
      setCurrentTeam(team)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success(`Joined ${team.name}!`)
    },
    onError: (err) => {
      toast.error((err as Error).message)
    },
  })

  return { teamsQuery, createTeamMutation, joinTeamMutation }
}
