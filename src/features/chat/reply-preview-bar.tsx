/**
 * ReplyPreviewBar – Inline bar shown above the chat input when replying.
 *
 * Displays a compact preview of the message being replied to,
 * with a close button to cancel the reply.
 */
import { X, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessageWithProfile } from '@/types/database'

interface ReplyPreviewBarProps {
  /** The message being replied to */
  message: ChatMessageWithProfile
  /** Whether the current user owns the message being replied to */
  isOwnMessage: boolean
  /** Cancel reply handler */
  onCancel: () => void
}

export function ReplyPreviewBar({ message, isOwnMessage, onCancel }: ReplyPreviewBarProps) {
  const senderName = isOwnMessage ? 'You' : (message.profiles?.full_name ?? 'Unknown')
  const previewText = message.is_deleted
    ? 'This message was deleted'
    : message.file_url
      ? `📎 ${message.file_name ?? 'File'}`
      : message.content

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-card/60 backdrop-blur animate-in slide-in-from-bottom-1 duration-150">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Reply className="w-4 h-4 text-primary shrink-0 scale-x-[-1]" />
        <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
          <p className="text-xs font-semibold text-primary truncate">{senderName}</p>
          <p className="text-xs text-muted-foreground truncate">{previewText}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-full"
        onClick={onCancel}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
