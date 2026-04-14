import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TeamMemberWithProfile } from '@/types/database'

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles(*)')
        .eq('team_id', teamId!)

      if (error) throw error
      return (data ?? []) as TeamMemberWithProfile[]
    },
    enabled: !!teamId,
  })
}
