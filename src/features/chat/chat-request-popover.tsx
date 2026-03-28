import { Check, Hand, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface ChatRequestItem {
  id: string
  initial_message: string
  created_at: string
  sender?: {
    full_name: string
    username: string | null
    avatar_url: string | null
  }
}

interface ChatRequestPopoverProps {
  requests: ChatRequestItem[]
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
  isPending?: boolean
  activeRequestId?: string
  isLoading?: boolean
}

export function ChatRequestPopover({
  requests,
  onAccept,
  onReject,
  isPending,
  activeRequestId,
  isLoading,
}: ChatRequestPopoverProps) {
  const { isMobile } = useResponsiveLayout()
  const [open, setOpen] = useState(false)
  const trigger = (
    <Button variant="ghost" size="icon" className="relative h-6 w-6">
      <Hand className="w-4 h-4" />
      {requests.length > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {requests.length > 9 ? '9+' : requests.length}
        </span>
      ) : null}
    </Button>
  )

  const content = (
    <>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Chat Requests</h3>
        <p className="text-xs text-muted-foreground">
          Review people who want to message you directly.
        </p>
      </div>

      <ScrollArea className="max-h-[420px]">
        <div className="p-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 flex-1 rounded-md" />
                      <Skeleton className="h-9 flex-1 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : requests.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No pending chat requests.
            </div>
          ) : (
            requests.map((request) => {
              const isBusy = isPending && activeRequestId === request.id

              return (
                <div key={request.id} className="rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/40">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage src={request.sender?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {getInitials(request.sender?.full_name ?? 'U')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {request.sender?.full_name ?? 'Unknown user'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{request.sender?.username ?? 'unknown'}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatRelativeTime(request.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {request.initial_message}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={isBusy}
                          onClick={() => {
                            onAccept(request.id)
                            if (isMobile) setOpen(false)
                          }}
                        >
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={isBusy}
                          onClick={() => {
                            onReject(request.id)
                            if (isMobile) setOpen(false)
                          }}
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </>
  )

  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon" className="relative h-6 w-6" onClick={() => setOpen(true)}>
          <Hand className="w-4 h-4" />
          {requests.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {requests.length > 9 ? '9+' : requests.length}
            </span>
          ) : null}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="p-0 sm:max-w-md">
            {content}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        {content}
      </PopoverContent>
    </Popover>
  )
}
