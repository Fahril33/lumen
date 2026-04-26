/**
 * MessageBubble – Enhanced chat message bubble with WhatsApp-style features.
 *
 * Supports:
 * - Reply preview (quoted message)
 * - Soft-deleted state ("This message was deleted")
 * - Edited indicator
 * - Star indicator
 * - Image/file attachments
 * - Read/received/sent status ticks
 * - Context menu (via MessageActionsMenu wrapper)
 */
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getInitials } from '@/lib/utils'
import { MessageActionsMenu } from '@/features/chat/message-actions-menu'
import {
  ImageIcon,
  FileIcon,
  Star,
  Ban,
  Check,
  X,
} from 'lucide-react'
import type { ChatMessageWithProfile } from '@/types/database'

interface MessageBubbleProps {
  message: ChatMessageWithProfile
  showHeader: boolean
  isOwn: boolean
  isStarred: boolean
  /** Callbacks for actions */
  onReply: (message: ChatMessageWithProfile) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onToggleStar: (messageId: string, currentlyStarred: boolean) => void
  /** Click handler for the quoted reply preview – scrolls to the original */
  onScrollToMessage?: (messageId: string) => void
}

export function MessageBubble({
  message,
  showHeader,
  isOwn,
  isStarred,
  onReply,
  onEdit,
  onDelete,
  onToggleStar,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const isImage = message.file_type?.startsWith('image/')
  const status = message.status || 'sent'
  const isRequestIntro = message.message_kind === 'request_intro'
  const isDeleted = message.is_deleted

  // --- Emoji-only detection (Must be top-level) ---
  const isEmojiOnly = useMemo(() => {
    if (!message.content || message.file_url || isEditing || isDeleted) return false
    const s = message.content.trim().replace(/\s/g, '')
    if (!s) return false
    // Simplified robust emoji regex
    try {
      const emojiOnlyRegex = /^(\p{Extended_Pictographic}|\u{200D}|\u{FE0F})+$/u
      return emojiOnlyRegex.test(s)
    } catch {
      return false
    }
  }, [message.content, message.file_url, isEditing, isDeleted])

  const emojiCount = useMemo(() => {
    if (!isEmojiOnly) return 0
    try {
      return [...message.content.trim().replace(/\s/g, '').matchAll(/\p{Extended_Pictographic}/gu)].length
    } catch {
      return 0
    }
  }, [isEmojiOnly, message.content])

  const isLargeEmoji = isEmojiOnly && emojiCount <= 3

  // --- Edit mode ---
  function startEdit() {
    setEditText(message.content)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditText('')
  }

  function confirmEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed)
    }
    setIsEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      confirmEdit()
    }
    if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // --- Reply preview block ---
  const replyToRaw = message.reply_to
  const replyTo = Array.isArray(replyToRaw) ? replyToRaw[0] : replyToRaw
  const replyPreview = replyTo && replyTo.id ? (
    <button
      type="button"
      className={`w-full text-left rounded-lg px-3 py-2 mb-1.5 border-l-3 transition-colors cursor-pointer ${
        isOwn && !isRequestIntro
          ? 'bg-primary-foreground/10 border-primary-foreground/40 hover:bg-primary-foreground/15'
          : 'bg-background/50 border-primary/40 hover:bg-accent/50'
      }`}
      onClick={() => onScrollToMessage?.(replyTo.id)}
    >
      <p className={`text-[11px] font-semibold truncate ${
        isOwn && !isRequestIntro ? 'text-primary-foreground/80' : 'text-primary'
      }`}>
        {replyTo.profiles?.full_name ?? 'Unknown'}
      </p>
      <p className={`text-[11px] truncate ${
        isOwn && !isRequestIntro ? 'text-primary-foreground/60' : 'text-muted-foreground'
      }`}>
        {replyTo.is_deleted
          ? 'This message was deleted'
          : replyTo.file_url
            ? `📎 ${replyTo.file_name ?? 'File'}`
            : replyTo.content}
      </p>
    </button>
  ) : null

  // --- Deleted state ---
  if (isDeleted) {
    return (
      <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-1'}`}>
        <div className={`flex max-w-[75%] md:max-w-[65%] gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar placeholder for alignment */}
          {!isOwn && (
            <div className="shrink-0 w-8 flex flex-col items-center">
              {showHeader && (
                <Avatar className="w-8 h-8 shadow-sm">
                  <AvatarImage src={message.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(message.profiles?.full_name ?? 'U')}</AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isOwn && showHeader && (
              <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
                {message.profiles?.full_name}
              </span>
            )}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/30 italic text-muted-foreground text-sm">
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>This message was deleted</span>
            </div>
            <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(message.created_at), 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Normal message ---
  const bubbleContent = (
    <div 
      data-message-id={message.id}
      className={`flex w-full transition-colors duration-300 ${isOwn ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-1'}`}
    >
      <div className={`flex max-w-[75%] md:max-w-[65%] gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="shrink-0 w-8 flex flex-col items-center">
            {showHeader && (
              <Avatar className="w-8 h-8 shadow-sm">
                <AvatarImage src={message.profiles?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{getInitials(message.profiles?.full_name ?? 'U')}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Header */}
          {!isOwn && showHeader && (
            <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
              {message.profiles?.full_name}
            </span>
          )}

          {/* Bubble core */}
          <div
            className={`relative rounded-2xl transition-all duration-200 ${
              isLargeEmoji
                ? 'px-0 py-0 shadow-none bg-transparent'
                : `px-4 py-2.5 shadow-sm overflow-hidden ${
                  isRequestIntro
                    ? 'bg-muted border border-border/60 text-foreground'
                    : isOwn
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border/50 rounded-tl-sm text-card-foreground'
                }`
            }`}
          >
            {/* Request intro label */}
            {isRequestIntro && (
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Request Message
              </div>
            )}

            {/* Reply preview (quoted) */}
            {replyPreview}

            {/* Star indicator */}
            {isStarred && !isLargeEmoji && (
              <Star className={`absolute top-2 right-2 w-3 h-3 fill-current ${
                isOwn && !isRequestIntro ? 'text-primary-foreground/50' : 'text-yellow-500/70'
              }`} />
            )}

            {/* Edit mode */}
            {isEditing ? (
              <div className="flex items-center gap-1.5 min-w-[200px]">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="flex-1 h-8 text-sm bg-background/20 border-none focus-visible:ring-1 focus-visible:ring-primary-foreground/30 text-inherit"
                  autoFocus
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-inherit hover:bg-primary-foreground/10"
                  onClick={confirmEdit}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-inherit hover:bg-primary-foreground/10"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Image attachment */}
                {message.file_url && isImage ? (
                  <div className="my-1 cursor-pointer">
                    <img
                      src={message.file_url}
                      alt={message.file_name ?? 'image'}
                      className="max-w-sm w-full rounded-lg object-cover"
                    />
                  </div>
                ) : message.file_url ? (
                  <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-colors my-1 ${
                      isOwn && !isRequestIntro
                        ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                        : 'bg-background/70 hover:bg-accent'
                    }`}
                  >
                    {message.file_type?.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileIcon className="w-4 h-4" />
                    ) }
                    <span className="text-sm font-medium underline underline-offset-2">{message.file_name}</span>
                  </a>
                ) : null}

                {/* Text content */}
                {(() => {
                  const content = message.content || ''
                  const limit = 600
                  const isLong = content.length > limit
                  const displayContent = (!isExpanded && isLong) ? content.slice(0, limit) + '...' : content
                  
                  if (message.file_url) return null

                  return (
                    <div className="relative">
                      <p className={`wrap-break-word ${isLargeEmoji ? 'text-5xl' : isEmojiOnly ? 'text-3xl' : 'text-[15px] leading-relaxed'}`}>
                        {displayContent}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => setIsExpanded(!isExpanded)}
                          className={`mt-1 text-xs font-semibold hover:underline block cursor-pointer ${
                            isOwn && !isRequestIntro ? 'text-primary-foreground/80' : 'text-primary'
                          }`}
                        >
                          {isExpanded ? 'Sembunyikan' : 'Lihat selengkapnya..'}
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* File caption with same logic */}
                {message.file_url && !message.content.startsWith('📎') && (
                  <div className="mt-2">
                    <p className="wrap-break-word text-[15px] leading-relaxed">
                      {!isExpanded && message.content.length > 300 
                        ? message.content.slice(0, 300) + '...' 
                        : message.content}
                    </p>
                    {message.content.length > 300 && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`mt-1 text-xs font-semibold hover:underline block ${
                          isOwn && !isRequestIntro ? 'text-primary-foreground/80' : 'text-primary'
                        }`}
                      >
                        {isExpanded ? 'Sembunyikan' : 'Lihat selengkapnya..'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Timestamp, edited indicator, and ticks */}
          <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.is_edited && (
              <span className="text-[10px] text-muted-foreground italic">edited</span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {isOwn && (
              <span className={status === 'read' ? 'text-blue-500' : 'text-muted-foreground'}>
                {status === 'read' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                ) : status === 'received' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Wrap with actions menu
  return (
    <MessageActionsMenu
      isOwn={isOwn}
      isStarred={isStarred}
      isDeleted={false}
      content={message.content}
      onReply={() => onReply(message)}
      onEdit={startEdit}
      onDelete={() => onDelete(message.id)}
      onToggleStar={() => onToggleStar(message.id, isStarred)}
      disabled={isEditing}
    >
      {bubbleContent}
    </MessageActionsMenu>
  )
}
