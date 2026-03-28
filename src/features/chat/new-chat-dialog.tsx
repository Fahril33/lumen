import { useDeferredValue, useMemo, useState } from 'react'
import { Loader2, MessageCircle, Search, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useChatRequestRecipientLookup, useCreateChatRequest } from '@/hooks/use-chat-requests'
import { getInitials } from '@/lib/utils'

interface FriendProfile {
  id: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

interface AcceptedFriend {
  id: string
  requester_id: string
  recipient?: FriendProfile
  requester?: FriendProfile
}

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  acceptedFriends: AcceptedFriend[]
  currentUserId?: string
  onStartChat: (friendId: string) => void
  isLoading?: boolean
}

export function NewChatDialog({
  open,
  onOpenChange,
  acceptedFriends,
  currentUserId,
  onStartChat,
  isLoading,
}: NewChatDialogProps) {
  const [tab, setTab] = useState<'friends' | 'contact'>('friends')
  const [username, setUsername] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const deferredUsername = useDeferredValue(username)
  const { createChatRequestMutation } = useCreateChatRequest()
  const lookupQuery = useChatRequestRecipientLookup(deferredUsername)

  const sortedFriends = useMemo(() => {
    return acceptedFriends.map((friendship) =>
      friendship.requester_id === currentUserId ? friendship.recipient : friendship.requester
    )
  }, [acceptedFriends, currentUserId])

  async function handleSendChatRequest() {
    await createChatRequestMutation.mutateAsync({
      username,
      message: initialMessage,
    })

    setUsername('')
    setInitialMessage('')
    setTab('friends')
    onOpenChange(false)
  }

  const lookupResult = lookupQuery.data
  const canSendRequest = lookupResult?.state === 'available' && initialMessage.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Start with a friend or send a chat request to a new username.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as 'friends' | 'contact')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="contact">New Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="pt-4">
            <ScrollArea className="max-h-72">
              <div className="space-y-1">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="w-full rounded-lg p-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : sortedFriends.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No friends found.
                  </p>
                ) : (
                  sortedFriends.map((friend) => (
                    <button
                      key={friend?.id}
                      onClick={() => {
                        if (!friend?.id) return
                        onStartChat(friend.id)
                      }}
                      className="w-full rounded-lg p-2 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/50">
                          <AvatarImage src={friend?.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {getInitials(friend?.full_name ?? 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {friend?.full_name || friend?.username}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{friend?.username}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="type username"
                  className="pl-9"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              {!username.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Enter a username to check whether the profile is available for new chat requests.
                </p>
              ) : lookupQuery.isFetching ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ) : lookupResult?.state === 'available' ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={lookupResult.profile.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {getInitials(lookupResult.profile.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lookupResult.profile.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{lookupResult.profile.username}</p>
                  </div>
                </div>
              ) : (
                <LookupStateMessage state={lookupResult?.state} />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">First Message</label>
              <Textarea
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Write a short intro so they know why you're reaching out..."
                maxLength={500}
              />
              <p className="text-right text-xs text-muted-foreground">
                {initialMessage.length}/500
              </p>
            </div>

            <Button
              className="w-full"
              disabled={!canSendRequest || createChatRequestMutation.isPending}
              onClick={handleSendChatRequest}
            >
              {createChatRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Send Chat Request
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function LookupStateMessage({ state }: { state?: 'idle' | 'self' | 'not_found' | 'disabled' | 'available' }) {
  if (state === 'self') {
    return <p className="text-sm text-muted-foreground">You cannot send a chat request to your own profile.</p>
  }

  if (state === 'disabled') {
    return <p className="text-sm text-muted-foreground">This user is not accepting new chat requests.</p>
  }

  if (state === 'not_found') {
    return <p className="text-sm text-muted-foreground">No public profile found for that username.</p>
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <UserRound className="h-4 w-4" />
      Waiting for a valid username.
    </div>
  )
}
