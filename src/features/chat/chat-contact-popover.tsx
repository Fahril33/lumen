import { Mail, MessageCircle, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { getInitials } from '@/lib/utils'

interface ChatContactPopoverProps {
  contact?: {
    id: string
    full_name?: string | null
    username?: string | null
    email?: string | null
    avatar_url?: string | null
    allow_anon_chat?: boolean
  } | null
  onOpenChat?: (contactId: string) => void
  size?: 'sm' | 'md'
  isLoading?: boolean
}

export function ChatContactPopover({ contact, onOpenChat, size = 'md', isLoading }: ChatContactPopoverProps) {
  const { isMobile } = useResponsiveLayout()
  const [open, setOpen] = useState(false)
  const avatarSizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'

  if (isLoading) {
    return <Skeleton className={`${avatarSizeClass} rounded-full`} />
  }

  if (!contact) {
    return (
      <Avatar className={`${avatarSizeClass} border border-border/50`}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    )
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-border/50">
          <AvatarImage src={contact.avatar_url ?? undefined} />
          <AvatarFallback>{getInitials(contact.full_name ?? contact.username ?? 'U')}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{contact.full_name || 'Unknown user'}</p>
          <p className="truncate text-xs text-muted-foreground">@{contact.username ?? 'unknown'}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{contact.email ?? 'No email available'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4" />
          <span>{contact.allow_anon_chat ? 'Accepting new chat requests' : 'Private direct messages only'}</span>
        </div>
      </div>

      {onOpenChat ? (
        <Button
          className="w-full"
          onClick={(event) => {
            event.stopPropagation()
            onOpenChat(contact.id)
            setOpen(false)
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Open Chat
        </Button>
      ) : null}
    </div>
  )

  const trigger = (
    <button
      type="button"
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => event.stopPropagation()}
    >
      <Avatar className={`${avatarSizeClass} border border-border/50`}>
        <AvatarImage src={contact.avatar_url ?? undefined} />
        <AvatarFallback>{getInitials(contact.full_name ?? contact.username ?? 'U')}</AvatarFallback>
      </Avatar>
    </button>
  )

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation()
            setOpen(true)
          }}
        >
          <Avatar className={`${avatarSizeClass} border border-border/50`}>
            <AvatarImage src={contact.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(contact.full_name ?? contact.username ?? 'U')}</AvatarFallback>
          </Avatar>
        </button>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contact</DialogTitle>
            <DialogDescription>Profile and chat actions.</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {content}
      </PopoverContent>
    </Popover>
  )
}
