import React, { useEffect, useState } from 'react'
import { ExternalLink, Globe, Loader2, Play } from 'lucide-react'

interface LinkMetadata {
  title?: string
  description?: string
  image?: string
  url: string
  siteName?: string
  type?: string
}

export const EMOJI_REGEX = /([\u{1f300}-\u{1f5ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f700}-\u{1f77f}\u{1f780}-\u{1f7ff}\u{1f900}-\u{1f9ff}\u{1fa00}-\u{1fa6f}\u{1fa70}-\u{1faff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])/gu

export function AppleEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16))
    .join('-')
  const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${codePoints}.png`

  return (
    <img
      src={url}
      alt={emoji}
      className={className || 'inline-block w-[1.2em] h-[1.2em] align-text-bottom mx-[0.05em]'}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        const span = document.createElement('span')
        span.textContent = emoji
        e.currentTarget.parentNode?.appendChild(span)
      }}
    />
  )
}

function getYouTubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

export function LinkPreview({ url, isPrimary = false }: { url: string; isPrimary?: boolean }) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const youtubeId = getYouTubeVideoId(url)

  useEffect(() => {
    let isMounted = true
    const fetchMetadata = async () => {
      try {
        setLoading(true)
        const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`
        const response = await fetch(apiUrl)
        const data = await response.json()

        if (isMounted && data.status === 'success') {
          const { title, description, image, url: finalUrl, logo } = data.data
          setMetadata({
            title,
            description,
            image: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : image?.url,
            url: finalUrl || url,
            siteName: logo?.url ? new URL(url).hostname : undefined,
            type: youtubeId ? 'video' : undefined
          })
          setError(false)
        } else if (isMounted) {
          setError(true)
        }
      } catch {
        if (isMounted) setError(true)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMetadata()
    return () => {
      isMounted = false
    }
  }, [url, youtubeId])

  if (loading) {
    return (
      <div className={`mt-2 rounded-xl border p-3 flex items-center gap-3 animate-pulse ${
        isPrimary ? 'bg-black/10 border-white/10' : 'bg-muted/30 border-border/50'
      }`}>
        <Loader2 className={`w-4 h-4 animate-spin ${isPrimary ? 'text-white/40' : 'text-muted-foreground'}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 rounded w-3/4 ${isPrimary ? 'bg-white/10' : 'bg-muted'}`} />
          <div className={`h-2 rounded w-1/2 ${isPrimary ? 'bg-white/5' : 'bg-muted'}`} />
        </div>
      </div>
    )
  }

  if (error || !metadata) return null

  const containerClasses = isPrimary 
    ? 'bg-black/25 border-white/10 hover:bg-black/35 hover:border-white/20 text-white'
    : 'bg-muted/50 border-border hover:bg-muted/80 hover:border-primary/30 text-foreground'

  const titleClasses = isPrimary ? 'text-white font-bold' : 'text-foreground'
  const descClasses = isPrimary ? 'text-white/85 font-medium' : 'text-muted-foreground'
  const metaClasses = isPrimary ? 'text-white/70 font-semibold' : 'text-muted-foreground'

  return (
    <a
      href={metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-xl border overflow-hidden transition-all group max-w-[280px] sm:max-w-sm shadow-md backdrop-blur-sm ${containerClasses}`}
    >
      {metadata.image && (
        <div className="relative aspect-video w-full overflow-hidden border-b border-white/5">
          <img
            src={metadata.image}
            alt={metadata.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          {youtubeId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${metaClasses}`}>
          <Globe className="w-3 h-3" />
          <span className="truncate">{new URL(metadata.url).hostname}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {metadata.title && (
          <h4 className={`text-sm leading-snug line-clamp-2 transition-colors ${titleClasses}`}>
            {metadata.title}
          </h4>
        )}
        {metadata.description && (
          <p className={`text-[11px] line-clamp-2 leading-relaxed ${descClasses}`}>
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  )
}

export function LinkifiedText({ text, isPrimary = false }: { text: string; isPrimary?: boolean }) {
  const URL_REGEX = /(https?:\/\/[^\s]+)/g
  const parts = text.split(URL_REGEX)

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline break-all transition-colors ${
                isPrimary ? 'text-white underline font-bold' : 'text-primary'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          )
        }
        
        const subParts = part.split(EMOJI_REGEX)
        return (
          <React.Fragment key={i}>
            {subParts.map((sub, j) => {
              if (sub.match(EMOJI_REGEX)) {
                return <AppleEmoji key={j} emoji={sub} />
              }
              return sub
            })}
          </React.Fragment>
        )
      })}
    </>
  )
}
