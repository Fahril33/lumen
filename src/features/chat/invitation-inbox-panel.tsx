import type { ReactNode } from 'react'
import { Check, Hand, Loader2, MailOpen, MailWarning, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import type { TeamInvitationWithRelations } from '@/hooks/use-team-invitations'

interface ChatRequestItem {
  id: string
  initial_message: string
  created_at: string
  sender?: {
    id: string
    full_name: string
    username: string | null
    avatar_url: string | null
  }
}

interface InvitationInboxPanelProps {
  chatRequests: ChatRequestItem[]
  teamInvitations: TeamInvitationWithRelations[]
  isLoading?: boolean
  respondingChatRequestId?: string
  respondingTeamInvitationId?: string
  onAcceptChatRequest: (requestId: string) => void
  onRejectChatRequest: (requestId: string) => void
  onAcceptTeamInvitation: (invitationId: string) => void
  onRejectTeamInvitation: (invitationId: string) => void
}

export function InvitationInboxPanel({
  chatRequests,
  teamInvitations,
  isLoading,
  respondingChatRequestId,
  respondingTeamInvitationId,
  onAcceptChatRequest,
  onRejectChatRequest,
  onAcceptTeamInvitation,
  onRejectTeamInvitation,
}: InvitationInboxPanelProps) {
  const totalItems = chatRequests.length + teamInvitations.length

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-card/85 px-4 py-4 backdrop-blur md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <MailWarning className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Inbox</h2>
            <p className="text-xs text-muted-foreground">
              Tempat semua undangan masuk, termasuk chat request dan team invitation.
            </p>
          </div>
          <div className="ml-auto rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {totalItems} pending
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-4 md:px-6">
        {isLoading ? (
          <InboxSkeleton />
        ) : totalItems === 0 ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center">
            <div className="max-w-sm space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MailOpen className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold">Inbox bersih</h3>
              <p className="text-sm text-muted-foreground">
                Belum ada chat request atau undangan tim yang menunggu respons.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            <InboxSection
              label="Chat Requests"
              description="Permintaan chat dari pengguna yang belum menjadi kontak."
            >
              {chatRequests.length === 0 ? (
                <EmptySectionMessage message="Tidak ada chat request yang pending." />
              ) : (
                chatRequests.map((request) => {
                  const isBusy = respondingChatRequestId === request.id

                  return (
                    <div key={request.id} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border border-border/50">
                          <AvatarImage src={request.sender?.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {getInitials(request.sender?.full_name ?? 'U')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {request.sender?.full_name ?? 'Unknown user'}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{request.sender?.username ?? 'unknown'}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatRelativeTime(request.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground">
                            {request.initial_message}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={isBusy}
                              onClick={() => onAcceptChatRequest(request.id)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              disabled={isBusy}
                              onClick={() => onRejectChatRequest(request.id)}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </InboxSection>

            <InboxSection
              label="Team Invitations"
              description="Undangan bergabung ke team dari member lain di platform."
            >
              {teamInvitations.length === 0 ? (
                <EmptySectionMessage message="Tidak ada undangan tim yang pending." />
              ) : (
                teamInvitations.map((invitation) => {
                  const isBusy = respondingTeamInvitationId === invitation.id

                  return (
                    <div
                      key={invitation.id}
                      className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border border-primary/20">
                          <AvatarImage src={invitation.inviter?.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {getInitials(invitation.inviter?.full_name ?? 'U')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {invitation.inviter?.full_name ?? 'Unknown inviter'}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                Mengundangmu ke <span className="font-medium text-foreground">{invitation.team?.name ?? 'Team'}</span>
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatRelativeTime(invitation.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 rounded-xl border border-primary/15 bg-background/80 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Invitation Message
                            </p>
                            <p className="mt-2 text-sm text-foreground">{invitation.message}</p>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Hand className="h-3.5 w-3.5" />
                            Team ID: <span className="font-mono text-foreground">{invitation.team?.invite_code ?? '-'}</span>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={isBusy}
                              onClick={() => onAcceptTeamInvitation(invitation.id)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Join Team
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              disabled={isBusy}
                              onClick={() => onRejectTeamInvitation(invitation.id)}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </InboxSection>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function InboxSection({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EmptySectionMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="space-y-6 pb-4">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/60 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-md" />
                    <Skeleton className="h-9 flex-1 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
