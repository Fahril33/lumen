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
import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getInitials } from '@/lib/utils'
import { MessageActionsMenu } from '@/features/chat/message-actions-menu'
import { LinkPreview, LinkifiedText, AppleEmoji } from '@/features/chat/link-preview'
import { EmojiPicker } from '@/features/chat/emoji-picker'
import { MediaViewer } from '@/features/chat/media-viewer'
import { AudioBubble } from '@/features/chat/audio-bubble'
import {
  FileIcon,
  Star,
  Check,
  Ban,
  X,
  SmilePlus,
  Play,
  Download,
} from 'lucide-react'
import type { ChatMessageWithProfile } from '@/types/database'

interface MessageBubbleProps {
  message: ChatMessageWithProfile
  showHeader: boolean
  isOwn: boolean
  isStarred: boolean
  canReact?: boolean
  currentUserId?: string
  /** Callbacks for actions */
  onReply: (message: ChatMessageWithProfile) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onToggleStar: (messageId: string, currentlyStarred: boolean) => void
  onReact?: (messageId: string, emoji: string) => void
  /** Click handler for the quoted reply preview – scrolls to the original */
  onScrollToMessage?: (messageId: string) => void
}

export const MessageBubble = React.memo(({
  message,
  showHeader,
  isOwn,
  isStarred,
  canReact = false,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onToggleStar,
  onReact,
  onScrollToMessage,
}: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [reactionOpen, setReactionOpen] = useState(false)
  const [reactionShowAll, setReactionShowAll] = useState(false)
  const [isMediaOpen, setIsMediaOpen] = useState(false)

  const isImage = message.file_type?.startsWith('image/')
  const status = message.status || 'sent'
  const isRequestIntro = message.message_kind === 'request_intro'
  const isDeleted = message.is_deleted

  const firstUrl = useMemo(() => {
    const match = (message.content || '').match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }, [message.content])

  const reactions = useMemo(() => {
    const raw = message.reactions as unknown
    if (!raw) return {} as Record<string, string[]>

    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        return {} as Record<string, string[]>
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {} as Record<string, string[]>

    const out: Record<string, string[]> = {}
    for (const [emoji, users] of Object.entries(parsed as Record<string, unknown>)) {
      if (!emoji || !Array.isArray(users)) continue
      const userIds = users.filter((u): u is string => typeof u === 'string')
      if (userIds.length === 0) continue
      out[emoji] = userIds
    }
    return out
  }, [message.reactions])

  const reactionSummary = useMemo(() => {
    const entries = Object.entries(reactions)
      .map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)

    let myEmoji: string | null = null
    if (currentUserId) {
      for (const entry of entries) {
        if (entry.userIds.includes(currentUserId)) {
          myEmoji = entry.emoji
          break
        }
      }
    }

    return { entries, myEmoji }
  }, [reactions, currentUserId])

  function handleReact(emoji: string) {
    if (!canReact || !onReact) return
    onReact(message.id, emoji)
    setReactionOpen(false)
    setReactionShowAll(false)
  }

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
  const hasReply = !!replyTo?.id
  const useTransparentEmojiBubble = isLargeEmoji && !hasReply
  const largeEmojiTextSizeClass = hasReply ? 'text-3xl' : 'text-5xl'
  const replyPreview = replyTo && replyTo.id ? (
    <button
      type="button"
      className={`w-full max-w-full text-left rounded-lg px-3 py-2 mb-1.5 border-l-3 transition-colors cursor-pointer ${
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
      <p className={`text-[11px] whitespace-normal break-words line-clamp-2 ${
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
        <div className={`flex min-w-0 max-w-[75%] md:max-w-[65%] gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
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
          <div className={`flex flex-col min-w-0 max-w-full ${isOwn ? 'items-end' : 'items-start'}`}>
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
      className={`chat-message-row flex w-full transition-colors duration-300 ${isOwn ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-1'}`}
    >
      <div
        className={`relative group flex min-w-0 max-w-[75%] md:max-w-[65%] gap-2 ${isOwn ? 'flex-row-reverse pl-12' : 'flex-row pr-12'}`}
      >
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

        <div className={`flex flex-col min-w-0 max-w-full ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && showHeader && (
            <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
              {message.profiles?.full_name}
            </span>
          )}

          <div className="relative">
            {/* Reaction button trigger - positioned relative to the bubble */}
            {canReact && !isEditing && onReact && (
              <Popover
                open={reactionOpen}
                onOpenChange={(open) => {
                  setReactionOpen(open)
                  if (!open) setReactionShowAll(false)
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="React"
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-border bg-background/90 backdrop-blur shadow-sm transition cursor-pointer ${
                      reactionOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                    } ${isOwn ? 'left-[-40px]' : 'right-[-40px]'}`}
                  >
                    <SmilePlus className="w-4 h-4 text-muted-foreground mx-auto" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side={isOwn ? 'left' : 'right'}
                  align="center"
                  className="w-auto p-2"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {!reactionShowAll ? (
                    <div className="flex items-center gap-1.5">
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-9 w-9 rounded-xl hover:bg-accent transition flex items-center justify-center"
                          onClick={() => handleReact(emoji)}
                        >
                          <AppleEmoji emoji={emoji} className="w-6 h-6" />
                        </button>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 rounded-xl"
                        onClick={() => setReactionShowAll(true)}
                      >
                        More
                      </Button>
                    </div>
                  ) : (
                    <EmojiPicker
                      onSelect={(emoji) => handleReact(emoji)}
                    />
                  )}
                </PopoverContent>
              </Popover>
            )}

            <div
              className={`relative rounded-2xl transition-all duration-200 ${
                useTransparentEmojiBubble
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
            {isRequestIntro && (
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Request Message
              </div>
            )}

            {replyPreview}

            {isStarred && !useTransparentEmojiBubble && (
              <Star className={`absolute top-2 right-2 w-3 h-3 fill-current ${
                isOwn && !isRequestIntro ? 'text-primary-foreground/50' : 'text-yellow-500/70'
              }`} />
            )}

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
                {message.file_url && (isImage || message.file_type?.startsWith('video/')) ? (
                  <div 
                    className="my-1 cursor-pointer group/media relative overflow-hidden rounded-lg shadow-sm"
                    onClick={() => setIsMediaOpen(true)}
                  >
                    {isImage ? (
                      <img
                        src={message.file_url}
                        alt={message.file_name ?? 'image'}
                        className="max-w-xs w-full max-h-80 object-cover transition-transform group-hover/media:scale-105 duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="max-w-xs w-full aspect-video bg-black/20 flex items-center justify-center relative">
                         <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-hover/media:scale-110">
                              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                            </div>
                         </div>
                         <video src={message.file_url} className="w-full h-full object-cover opacity-80" />
                      </div>
                    )}
                  </div>
                ) : message.file_url ? (
                  message.file_type?.startsWith('audio/') ? (
                    <AudioBubble 
                      url={message.file_url} 
                      fileName={message.file_name ?? 'Audio'} 
                      isOwn={isOwn && !isRequestIntro} 
                    />
                  ) : (
                    <div className="my-1">
                      <a
                        href={message.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                          isOwn && !isRequestIntro
                            ? 'bg-primary-foreground/10 border-white/20 text-white hover:bg-primary-foreground/20'
                            : 'bg-card border-border hover:bg-accent text-foreground shadow-sm'
                        }`}
                      >
                        <FileIcon className="w-5 h-5 text-primary" />
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-xs font-semibold truncate max-w-[180px]">{message.file_name}</span>
                          <span className="text-[10px] opacity-60 uppercase tracking-tighter">View File</span>
                        </div>
                        <Download className="w-4 h-4 ml-2 opacity-40 group-hover:opacity-100" />
                      </a>
                    </div>
                  )
                ) : null}

                {(() => {
                  const content = message.content || ''
                  const limit = 600
                  const isLong = content.length > limit
                  const displayContent = (!isExpanded && isLong) ? content.slice(0, limit) + '...' : content
                  
                  if (message.file_url) return null

                  return (
                    <div className="relative">
                      <p className={`wrap-break-word ${isLargeEmoji ? largeEmojiTextSizeClass : isEmojiOnly ? 'text-3xl' : 'text-[15px] leading-relaxed'}`}>
                        <LinkifiedText text={displayContent} isPrimary={isOwn && !isRequestIntro} />
                      </p>
                      {firstUrl && !isEmojiOnly && <LinkPreview url={firstUrl} isPrimary={isOwn && !isRequestIntro} />}
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

          </div>

          {reactionSummary.entries.length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {reactionSummary.entries.map(({ emoji }) => {
                const isMine = reactionSummary.myEmoji === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReact(emoji)
                    }}
                    className={`inline-flex items-center justify-center rounded-full border px-2 py-1 bg-background/70 backdrop-blur transition hover:bg-accent shadow-sm ${
                      isMine ? 'border-primary/60 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <AppleEmoji emoji={emoji} className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          )}

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
      fileUrl={message.file_url}
      fileName={message.file_name}
      disabled={isEditing}
    >
      {bubbleContent}

      <MediaViewer
        url={message.file_url}
        fileName={message.file_name}
        fileType={message.file_type}
        senderName={message.profiles?.full_name}
        timestamp={message.created_at}
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
      />
    </MessageActionsMenu>
  )
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.is_edited === next.message.is_edited &&
    prev.message.is_deleted === next.message.is_deleted &&
    prev.isStarred === next.isStarred &&
    prev.showHeader === next.showHeader &&
    JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions)
  )
})
