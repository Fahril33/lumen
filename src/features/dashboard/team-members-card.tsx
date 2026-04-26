import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Loader2, MailCheck, MailPlus, UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useFriendships } from '@/hooks/use-friend-chat'
import { useTeamInvitations } from '@/hooks/use-team-invitations'
import { useTeamMembers } from '@/hooks/use-team-members'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface TeamMembersCardProps {
  teamId: string
  teamInviteCode: string
}

type InvitationCandidate = Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'>

export function TeamMembersCard({ teamId, teamInviteCode }: TeamMembersCardProps) {
  const user = useAuthStore((state) => state.user)
  const { friendshipsQuery, sendFriendRequest } = useFriendships()
  const membersQuery = useTeamMembers(teamId)
  const { invitationsQuery, createInvitationMutation } = useTeamInvitations(teamId)

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const friendships = useMemo(() => friendshipsQuery.data ?? [], [friendshipsQuery.data])
  const invitations = useMemo(() => invitationsQuery.data ?? [], [invitationsQuery.data])
  const joinedMemberIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members])
  const pendingInvitationIds = useMemo(
    () =>
      new Set(
        invitations
          .filter((invitation) => invitation.status === 'pending')
          .map((invitation) => invitation.invitee_id)
      ),
    [invitations]
  )

  const friendshipStatusByUserId = useMemo(() => {
    const statusMap = new Map<string, 'accepted' | 'pending'>()

    for (const friendship of friendships as Array<Record<string, unknown>>) {
      const requesterId = friendship.requester_id as string
      const recipientId = friendship.recipient_id as string
      const otherUserId = requesterId === user?.id ? recipientId : requesterId
      const status = friendship.status as 'accepted' | 'pending' | 'blocked'

      if (status === 'accepted' || status === 'pending') {
        statusMap.set(otherUserId, status)
      }
    }

    return statusMap
  }, [friendships, user?.id])

  const friendCandidates = useMemo(() => {
    const accepted = (friendships as Array<Record<string, unknown>>).filter(
      (friendship) => friendship.status === 'accepted'
    )

    return accepted
      .map((friendship) =>
        friendship.requester_id === user?.id
          ? (friendship.recipient as InvitationCandidate | undefined)
          : (friendship.requester as InvitationCandidate | undefined)
      )
      .filter(Boolean) as InvitationCandidate[]
  }, [friendships, user?.id])

  async function handleCopyInvitationId() {
    const inviteId = teamInviteCode
    if (!inviteId) return
    await navigator.clipboard.writeText(inviteId)
  }

  return (
    <Card className="dashboard-team-card bg-card/50 backdrop-blur border-border/50 flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Team Members
          </CardTitle>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="dashboard-team-copy-button h-8 w-8"
                  onClick={() => {
                    void handleCopyInvitationId()
                  }}
                  disabled={!teamInviteCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy ID invitation</TooltipContent>
            </Tooltip>

            <InviteMembersPopover
              friendCandidates={friendCandidates}
              joinedMemberIds={joinedMemberIds}
              pendingInvitationIds={pendingInvitationIds}
              onInvite={(inviteeUserId, message) =>
                createInvitationMutation.mutate({ inviteeUserId, message })
              }
              isInviting={createInvitationMutation.isPending}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <div className="dashboard-team-members-scroll-area max-h-[400px] overflow-y-auto px-6 pb-6 pt-0 touch-pan-y scroll-smooth">
          <div className="space-y-1">
            {membersQuery.isLoading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))
            ) : (
              members.map((member) => {
                const memberProfile = member.profiles
                const friendshipStatus = friendshipStatusByUserId.get(member.user_id)
                const canAddFriend =
                  member.user_id !== user?.id &&
                  memberProfile?.username &&
                  !friendshipStatus

                return (
                  <div
                    key={member.id}
                    className="dashboard-team-member-item flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={memberProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(memberProfile?.full_name ?? 'U')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{memberProfile?.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{memberProfile?.username ?? 'no-username'}
                      </p>
                    </div>

                    {friendshipStatus === 'pending' ? (
                      <span className="dashboard-team-member-status rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                        Pending
                      </span>
                    ) : canAddFriend ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="dashboard-team-member-add-friend h-8 w-8 shrink-0"
                            disabled={sendFriendRequest.isPending}
                            onClick={() => sendFriendRequest.mutate(memberProfile.username!)}
                          >
                            {sendFriendRequest.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add friend</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InviteMembersPopover({
  friendCandidates,
  joinedMemberIds,
  pendingInvitationIds,
  onInvite,
  isInviting,
}: {
  friendCandidates: InvitationCandidate[]
  joinedMemberIds: Set<string>
  pendingInvitationIds: Set<string>
  onInvite: (inviteeUserId: string, message: string) => void
  isInviting: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('Hi! Ayo gabung timku!')
  const deferredQuery = useDeferredValue(query)

  const localMatches = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    if (!normalized) return friendCandidates

    return friendCandidates.filter((friend) => {
      const fullName = friend.full_name?.toLowerCase() ?? ''
      const username = friend.username?.toLowerCase() ?? ''
      return fullName.includes(normalized) || username.includes(normalized)
    })
  }, [deferredQuery, friendCandidates])

  const shouldUsePublicFallback = deferredQuery.trim().length >= 3 && localMatches.length === 0

  const publicLookupQuery = useQuery({
    queryKey: ['team-invite-lookup', deferredQuery],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('profiles') as any)
        .select('id, full_name, username, avatar_url')
        .eq('allow_anon_chat', true)
        .ilike('username', `${deferredQuery.trim().toLowerCase()}%`)
        .neq('id', user?.id)
        .limit(8)

      if (error) throw error
      return (data ?? []) as InvitationCandidate[]
    },
    enabled: open && shouldUsePublicFallback,
  })

  const candidates = shouldUsePublicFallback ? publicLookupQuery.data ?? [] : localMatches
  const hasNoResults =
    deferredQuery.trim().length > 0 &&
    !publicLookupQuery.isFetching &&
    candidates.length === 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="dashboard-team-invite-button h-8 w-8">
          <UserPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="dashboard-invite-popover w-[min(28rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Add Members</h3>
          <p className="text-xs text-muted-foreground">
            Search your friends first, then fallback to public usernames.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="dashboard-invite-search-input"
          />

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Invitation Message
            </label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="dashboard-invite-message-textarea min-h-20"
              maxLength={240}
            />
          </div>

          <div className="dashboard-invite-results-scroll max-h-72 overflow-y-auto pr-3 touch-pan-y scroll-smooth">
            <div className="space-y-1 pr-2">
              {publicLookupQuery.isFetching ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                ))
              ) : hasNoResults ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada pengguna yang ditemukan.
                </div>
              ) : !deferredQuery.trim() && candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada teman yang bisa diundang. Cari username publik untuk mengundang user lain.
                </div>
              ) : (
                candidates.map((candidate) => {
                  const isJoined = joinedMemberIds.has(candidate.id)
                  const isInvited = pendingInvitationIds.has(candidate.id)
                  const canInvite = !isJoined && !isInvited && !!candidate.username

                  return (
                    <div
                      key={candidate.id}
                      className="dashboard-invite-candidate-item flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/50"
                    >
                      <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage src={candidate.avatar_url ?? undefined} />
                        <AvatarFallback>{getInitials(candidate.full_name ?? 'U')}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {candidate.full_name || candidate.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{candidate.username ?? 'no-username'}
                        </p>
                      </div>

                      {isJoined ? (
                        <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                          Joined
                        </span>
                      ) : isInvited ? (
                        <Button type="button" size="sm" variant="outline" disabled>
                          <MailCheck className="h-4 w-4" />
                          Invited
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canInvite || isInviting}
                          onClick={() => onInvite(candidate.id, message.trim() || 'Hi! Ayo gabung timku!')}
                        >
                          {isInviting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MailPlus className="h-4 w-4" />
                          )}
                          Invite
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground">
            Priority 1: friends by full name or username. Priority 2: public users by username.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
