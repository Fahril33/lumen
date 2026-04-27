import React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface MediaViewerProps {
  url: string | null
  fileName: string | null
  fileType: string | null
  senderName?: string
  timestamp?: string
  isOpen: boolean
  onClose: () => void
}

export function MediaViewer({
  url,
  fileName,
  fileType,
  senderName,
  timestamp,
  isOpen,
  onClose,
}: MediaViewerProps) {
  if (!url) return null

  const isVideo = fileType?.startsWith('video/')
  
  const handleDownload = async () => {
    if (!url) return
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab if fetch fails (e.g. CORS)
      window.open(url, '_blank')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        hideClose
        className="max-w-5xl w-[95vw] h-auto max-h-[90dvh] p-0 border-none bg-black/95 gap-0 flex flex-col z-[100] sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        
        {/* Top Bar - Now sticky to the modal, not the screen */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/10 backdrop-blur-md border-b border-white/5 text-white shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">
              {fileName || 'Media'}
            </span>
            {(senderName || timestamp) && (
              <span className="text-[10px] opacity-70">
                {senderName} • {timestamp ? format(new Date(timestamp), 'dd MMM yyyy, HH:mm') : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
              onClick={() => window.open(url, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Media Area - Balanced scaling */}
        <div className="flex-1 flex items-center justify-center bg-black/40 min-h-[300px] overflow-hidden p-2 sm:p-4">
          {isVideo ? (
            <video
              src={url}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded shadow-lg"
            />
          ) : (
            <img
              src={url}
              alt={fileName || 'Image'}
              className="max-w-full max-h-[75vh] object-contain rounded shadow-lg animate-in fade-in zoom-in-95 duration-300"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
