/**
 * ChatListItem – Single chat entry in the sidebar list.
 *
 * Supports:
 * - Long-press (mobile) / right-click (desktop) for hold actions
 * - Actions: Block user, Delete chat
 * - Last message preview, unread count, status ticks
 */
import { useState, useRef, useCallback, useMemo, type TouchEvent } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePresenceStore } from '@/stores/presence-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { useChatDrafts } from '@/hooks/use-chat-drafts'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { Trash2, MoreVertical } from 'lucide-react'
import { AppleEmoji, EMOJI_REGEX } from '@/features/chat/link-preview'

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Status tick SVGs (compact) ---
const StatusTick = ({ msgStatus }: { msgStatus: string }) => {
  const color = msgStatus === 'read' ? 'text-blue-500' : 'text-muted-foreground'
  if (msgStatus === 'read') {
    return (
      <span className={color}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
      </span>
    )
  }
  if (msgStatus === 'received') {
    return (
      <span className={color}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
      </span>
    )
  }
  return (
    <span className={color}>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </span>
  )
}

interface ChatListItemProps {
  chat: any
  isActive: boolean
  currentUserId: string | undefined
  onSelect: () => void
  onDeleteChat: (chatId: string) => void
  getChatName: (chat: any) => string
  getChatAvatar: (chat: any) => string | null
}

export function ChatListItem({
  chat,
  isActive,
  currentUserId,
  onSelect,
  onDeleteChat,
  getChatName,
  getChatAvatar,
}: ChatListItemProps) {
  const { isMobile } = useResponsiveLayout()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  const lastMsg = chat.messages?.[0]
  const isUnread = lastMsg && lastMsg.user_id !== currentUserId && lastMsg.status !== 'read'
  const { draft } = useChatDrafts(chat.id)
  const { typingUsers } = useTypingIndicator(chat.id)
  const isTyping = typingUsers.length > 0
  const chatName = getChatName(chat)
  const chatAvatar = getChatAvatar(chat)

  const otherUser = useMemo(() => {
    if (chat.is_group) return null
    return chat.participants?.find((p: any) => p.profiles.id !== currentUserId)?.profiles
  }, [chat, currentUserId])

  const isOnline = usePresenceStore((s) => otherUser ? s.onlineUsers.has(otherUser.id) : false)

  // --- Mobile long-press ---
  const handleTouchStart = useCallback((e: TouchEvent) => {
    didLongPressRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      e.preventDefault()
      setMobileSheetOpen(true)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    // If long press happened, don't fire the regular click
    if (didLongPressRef.current) {
      didLongPressRef.current = false
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (didLongPressRef.current) return
    onSelect()
  }, [onSelect])

  // --- Hold action items ---
  const holdActions = (close: () => void) => (
    <>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-accent transition-colors"
        onClick={() => { onDeleteChat(chat.id); close() }}
      >
        <Trash2 className="w-4 h-4" />
        Delete chat
      </button>
    </>
  )

  const listContent = (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex-1 flex items-center gap-3 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="relative shrink-0">
          <Avatar className="w-10 h-10 border border-border/50">
            <AvatarImage src={chatAvatar ?? undefined} />
            <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex justify-between items-baseline mb-0.5">
            <span className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>
              {chatName}
            </span>
            {lastMsg && (
              <span className={`text-[10px] shrink-0 ml-2 ${isUnread ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {format(new Date(lastMsg.created_at), 'HH:mm')}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              {isTyping ? (
                <p className="text-xs line-clamp-1 break-all flex-1 text-green-500 font-medium italic animate-pulse">
                  typing...
                </p>
              ) : draft ? (
                <p className="text-xs line-clamp-1 break-all flex-1 text-primary">
                  <span className="font-semibold">Draft: </span>
                  <span className="text-muted-foreground">
                    {draft.split(EMOJI_REGEX).map((part: string, i: number) => {
                      if (part.match(EMOJI_REGEX)) {
                        return <AppleEmoji key={i} emoji={part} className="w-[1.2em] h-[1.2em] inline-block align-text-bottom mx-[0.05em]" />
                      }
                      return part
                    })}
                  </span>
                </p>
              ) : (
                <>
                  {lastMsg && lastMsg.user_id === currentUserId && (
                    <StatusTick msgStatus={lastMsg.status ?? 'sent'} />
                  )}
                  <p className={`text-xs line-clamp-1 break-all flex-1 ${isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {(lastMsg?.content || 'Say hi!').split(EMOJI_REGEX).map((part: string, i: number) => {
                      if (part.match(EMOJI_REGEX)) {
                        return <AppleEmoji key={i} emoji={part} className="w-[1.2em] h-[1.2em] inline-block align-text-bottom mx-[0.05em]" />
                      }
                      return part
                    })}
                  </p>
                </>
              )}
            </div>
            {isUnread && chat.unread_count > 0 && (
              <div className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                {chat.unread_count}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Options Button */}
      <div className={`shrink-0 hover-reveal ${isMobile ? 'opacity-100' : ''}`}>
        {!isMobile ? (
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        ) : (
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background/80 text-muted-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setMobileSheetOpen(true)
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  )

  // ============================================================
  // Mobile: long-press for bottom sheet
  // ============================================================
  if (isMobile) {
    return (
      <>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className={`relative w-full flex items-center p-2 rounded-xl transition-all group select-none ${
            isActive ? 'bg-primary/10' : 'hover:bg-accent'
          }`}
        >
          {listContent}
        </div>

        {mobileSheetOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setMobileSheetOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" />
            <div
              className="relative w-full max-w-sm mx-4 mb-6 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat info header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Avatar className="w-10 h-10 border border-border/50">
                  <AvatarImage src={chatAvatar ?? undefined} />
                  <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{chatName}</p>
                  <p className="text-xs text-muted-foreground">
                    {chat.is_group ? 'Group chat' : 'Direct chat'}
                  </p>
                </div>
              </div>
              <div className="py-1">
                {holdActions(() => setMobileSheetOpen(false))}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ============================================================
  // Desktop: right-click dropdown
  // ============================================================
  return (
    <DropdownMenu>
      <div className={`relative w-full flex items-center p-2 rounded-xl transition-all group ${
        isActive ? 'bg-primary/10' : 'hover:bg-accent'
      }`}>
        {listContent}
      </div>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onDeleteChat(chat.id)} className="gap-2 text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4" />
          Delete chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
