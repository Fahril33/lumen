import { useQuery } from '@tanstack/react-query'
import { TeamMembersCard } from '@/features/dashboard/team-members-card'
import { useTeamMembers } from '@/hooks/use-team-members'
import { useTeams } from '@/hooks/use-teams'
import { supabase } from '@/lib/supabase'
import { useTeamStore } from '@/stores/team-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils'
import type { ActivityWithProfile } from '@/types/database'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  MessageSquare,
  FileText,
  FolderPlus,
  UserPlus,
  Hash,
  Upload,
  Activity,
  Users,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

const activityIcons: Record<string, React.ReactNode> = {
  message_sent: <MessageSquare className="w-4 h-4 text-chart-1" />,
  note_created: <FileText className="w-4 h-4 text-chart-2" />,
  note_updated: <FileText className="w-4 h-4 text-chart-3" />,
  folder_created: <FolderPlus className="w-4 h-4 text-chart-4" />,
  member_joined: <UserPlus className="w-4 h-4 text-chart-5" />,
  channel_created: <Hash className="w-4 h-4 text-chart-1" />,
  file_uploaded: <Upload className="w-4 h-4 text-chart-3" />,
}

export function DashboardView() {
  const { currentTeam } = useTeamStore()
  const { teamsQuery } = useTeams()
  const membersQuery = useTeamMembers(currentTeam?.id)

  const activitiesQuery = useQuery({
    queryKey: ['activities', currentTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, profiles(*)')
        .eq('team_id', currentTeam!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as ActivityWithProfile[]
    },
    enabled: !!currentTeam,
  })

  const statsQuery = useQuery({
    queryKey: ['team-stats', currentTeam?.id],
    queryFn: async () => {
      const { data: channelRows, error: channelError } = await supabase
        .from('channels')
        .select('id')
        .eq('team_id', currentTeam!.id)

      if (channelError) throw channelError

      const channelIds = ((channelRows ?? []) as Array<{ id: string }>).map((channel) => channel.id)

      const [channels, notes, messages] = await Promise.all([
        supabase.from('channels').select('id', { count: 'exact', head: true }).eq('team_id', currentTeam!.id),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('team_id', currentTeam!.id),
        channelIds.length > 0
          ? supabase.from('messages').select('id', { count: 'exact', head: true }).in('channel_id', channelIds)
          : Promise.resolve({ count: 0, data: null, error: null as PostgrestError | null }),
      ])
      return {
        channels: channels.count ?? 0,
        notes: notes.count ?? 0,
        messages: messages.count ?? 0,
        members: membersQuery.data?.length ?? 0,
      }
    },
    enabled: !!currentTeam && membersQuery.status === 'success',
  })

  const activities = activitiesQuery.data
  const members = membersQuery.data
  const stats = statsQuery.data
  const isTeamsLoading = teamsQuery.isLoading || teamsQuery.isFetching
  const isDashboardLoading =
    !!currentTeam &&
    (activitiesQuery.isLoading || membersQuery.isLoading || statsQuery.isLoading)

  if (isTeamsLoading && !currentTeam) {
    return <DashboardSkeleton />
  }

  if (!currentTeam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Lumen: Teams</h2>
          <p className="text-muted-foreground max-w-md">
            Create or join a team to get started with collaboration.
          </p>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Members', value: stats?.members ?? members?.length ?? 0, icon: <Users className="w-5 h-5" />, color: 'text-chart-1' },
    { label: 'Channels', value: stats?.channels ?? 0, icon: <Hash className="w-5 h-5" />, color: 'text-chart-2' },
    { label: 'Notes', value: stats?.notes ?? 0, icon: <FileText className="w-5 h-5" />, color: 'text-chart-3' },
    { label: 'Activity', value: activities?.length ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-chart-4' },
  ]

  return (
    <div className="flex-1 overflow-auto overscroll-contain p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {currentTeam.name} — Overview & recent activity
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isDashboardLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="bg-card/50 backdrop-blur border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-8 w-10" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))
            : statCards.map((stat) => (
                <Card key={stat.label} className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={stat.color}>{stat.icon}</span>
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="md:col-span-2 bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {isDashboardLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-3 p-2">
                        <Skeleton className="mt-0.5 h-4 w-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !activities?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="mt-0.5">{activityIcons[act.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{act.profiles?.full_name}</span>{' '}
                            <span className="text-muted-foreground">
                              {act.type.replace(/_/g, ' ')}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(act.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <TeamMembersCard teamId={currentTeam.id} teamInviteCode={currentTeam.invite_code} />
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-auto overscroll-contain p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-8 w-10" />
                </div>
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur md:col-span-2">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3 p-2">
                  <Skeleton className="mt-0.5 h-4 w-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
