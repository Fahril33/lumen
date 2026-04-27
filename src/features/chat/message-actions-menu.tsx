/**
 * MessageActionsMenu – Context menu / long-press menu for message actions.
 *
 * WhatsApp-style action sheet that appears on long-press (mobile)
 * or right-click (desktop). Actions: Reply, Edit, Star, Delete.
 *
 * Uses Radix ContextMenu for desktop, and a custom bottom-sheet
 * overlay for mobile (triggered imperatively).
 */
import { useState, useRef, useCallback, type ReactNode, type TouchEvent } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Reply, Pencil, Star, Trash2, Copy, StarOff, Download } from 'lucide-react'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { toast } from 'sonner'

interface MessageActionsMenuProps {
  children: ReactNode
  /** Whether the current user is the author */
  isOwn: boolean
  /** Whether the message is starred */
  isStarred: boolean
  /** Whether the message has been soft-deleted */
  isDeleted: boolean
  /** The raw text content */
  content: string
  /** Callbacks */
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
  /** Optional file info for downloads */
  fileUrl?: string | null
  fileName?: string | null
  /** Disables the menu trigger (e.g. during edit mode) */
  disabled?: boolean
}

export function MessageActionsMenu({
  children,
  isOwn,
  isStarred,
  isDeleted,
  content,
  onReply,
  onEdit,
  onDelete,
  onToggleStar,
  fileUrl,
  fileName,
  disabled = false,
}: MessageActionsMenuProps) {
  const { isMobile } = useResponsiveLayout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  // --- Copy text to clipboard ---
  const handleCopy = useCallback(() => {
    if (!content) return
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }, [content])

  // --- Download file ---
  const handleDownload = useCallback(async () => {
    if (!fileUrl) return
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    } catch (err) {
      console.error('Download failed:', err)
      window.open(fileUrl, '_blank')
    }
  }, [fileUrl, fileName])

  // --- Mobile: long-press handlers ---
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return
    didLongPressRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      // Prevent text selection
      e.preventDefault()
      setMobileOpen(true)
    }, 500)
  }, [disabled])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // --- Action items (shared between desktop and mobile) ---
  const actionItems = (
    close: () => void
  ) => (
    <>
      {!isDeleted && (
        <ContextMenuItem
          onClick={() => { onReply(); close() }}
          className="gap-2"
        >
          <Reply className="w-4 h-4 scale-x-[-1]" />
          Reply
        </ContextMenuItem>
      )}
      {!isDeleted && (
        <ContextMenuItem
          onClick={() => { handleCopy(); close() }}
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy
        </ContextMenuItem>
      )}
      {fileUrl && !isDeleted && (
        <ContextMenuItem
          onClick={() => { handleDownload(); close() }}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </ContextMenuItem>
      )}
      {!isDeleted && (
        <ContextMenuItem
          onClick={() => { onToggleStar(); close() }}
          className="gap-2"
        >
          {isStarred ? (
            <>
              <StarOff className="w-4 h-4" />
              Unstar
            </>
          ) : (
            <>
              <Star className="w-4 h-4" />
              Star
            </>
          )}
        </ContextMenuItem>
      )}
      {isOwn && !isDeleted && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => { onEdit(); close() }}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => { onDelete(); close() }}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </ContextMenuItem>
        </>
      )}
    </>
  )

  // ============================================================
  //  Mobile: bottom sheet overlay
  // ============================================================
  if (isMobile) {
    if (disabled) return <>{children}</>

    return (
      <>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="select-none"
        >
          {children}
        </div>

        {/* Mobile bottom sheet overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setMobileOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" />

            {/* Sheet */}
            <div
              className="relative w-full max-sm mx-4 mb-6 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                {!isDeleted && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => { onReply(); setMobileOpen(false) }}
                  >
                    <Reply className="w-4 h-4 scale-x-[-1] text-muted-foreground" />
                    Reply
                  </button>
                )}
                {!isDeleted && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => { handleCopy(); setMobileOpen(false) }}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                    Copy
                  </button>
                )}
                {fileUrl && !isDeleted && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => { handleDownload(); setMobileOpen(false) }}
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                    Download
                  </button>
                )}
                {!isDeleted && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => { onToggleStar(); setMobileOpen(false) }}
                  >
                    {isStarred ? (
                      <>
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                        Unstar
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 text-muted-foreground" />
                        Star
                      </>
                    )}
                  </button>
                )}
                {isOwn && !isDeleted && (
                  <>
                    <div className="h-px bg-border mx-3 my-1" />
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
                      onClick={() => { onEdit(); setMobileOpen(false) }}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-accent transition-colors"
                      onClick={() => { onDelete(); setMobileOpen(false) }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ============================================================
  //  Desktop: Radix ContextMenu (right-click)
  // ============================================================
  if (disabled) return <>{children}</>

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="cursor-default">
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-44"
      >
        {actionItems(() => {})}
      </ContextMenuContent>
    </ContextMenu>
  )
}
