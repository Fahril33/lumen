/**
 * FilePreviewDialog – WhatsApp-style file preview before sending.
 *
 * Shows a modal with the file preview (image or file info),
 * an optional caption input, and send/cancel buttons.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, FileIcon, ImageIcon } from 'lucide-react'

interface FilePreviewDialogProps {
  /** The file object to preview */
  file: File | null
  /** Whether the dialog is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Send handler – receives the file and optional caption */
  onSend: (file: File, caption: string) => void
  /** Whether the upload is in progress */
  isSending?: boolean
}

export function FilePreviewDialog({
  file,
  open,
  onClose,
  onSend,
  isSending = false,
}: FilePreviewDialogProps) {
  const [caption, setCaption] = useState('')
  const captionInputRef = useRef<HTMLInputElement>(null)

  const isImage = file?.type.startsWith('image/')

  // Generate object URL for image previews
  const previewUrl = useMemo(() => {
    if (!file || !isImage) return null
    return URL.createObjectURL(file)
  }, [file, isImage])

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => captionInputRef.current?.focus(), 150)
    }
  }, [open])

  function handleSend() {
    if (!file) return
    onSend(file, caption.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!file) return null

  // Format file size
  const fileSize = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Preview file</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 min-w-0">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <FileIcon className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{fileSize}</span>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex items-center justify-center bg-black/5 dark:bg-white/5 min-h-[200px] max-h-[50vh] overflow-hidden">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[50vh] object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 px-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium truncate max-w-[250px]">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {file.type || 'Unknown type'} · {fileSize}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Caption + send */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card/50">
          <Input
            ref={captionInputRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a caption…"
            className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm h-10"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="shrink-0 rounded-full h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSend}
            disabled={isSending}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
