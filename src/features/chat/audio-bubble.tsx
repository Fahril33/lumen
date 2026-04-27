import React, { useState, useRef, useMemo } from 'react'
import { Play, Pause, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioBubbleProps {
  url: string
  fileName: string
  isOwn: boolean
}

export function AudioBubble({ url, fileName, isOwn }: AudioBubbleProps) {
  const [isReady, setIsReady] = useState(isOwn)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Generate deterministic wave heights based on index to keep render pure
  const waveHeights = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      base: 15 + Math.sin(i * 0.8) * 10 + (Math.sin(i * 2.5) * 5),
      variance: 5 + (Math.cos(i * 1.5) * 5)
    }))
  }, [])

  const handleDownload = () => {
    setLoading(true)
    // Simulate prep
    setTimeout(() => {
      setIsReady(true)
      setLoading(false)
    }, 600)
  }

  const togglePlay = () => {
    if (!audioRef.current || !isReady) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || !isReady) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className={`flex flex-col w-full gap-1.5 py-2 px-1 min-w-[240px] max-w-sm ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
      <div className="flex items-center gap-3">
        {!isReady ? (
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 shrink-0 rounded-full border ${
              isOwn ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-border bg-accent/50 hover:bg-accent'
            }`}
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 shrink-0 rounded-full border ${
              isOwn ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-border bg-accent/50 hover:bg-accent'
            }`}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>
        )}
        
        {/* Visualizer / Waveform */}
        <div 
          className={`flex-1 flex items-end gap-[2px] h-8 px-1 group/wave ${isReady ? 'cursor-pointer' : 'opacity-40'}`}
          onClick={handleSeek}
        >
          {waveHeights.map((wave, i) => {
            const isActive = isReady && (i / waveHeights.length) * 100 <= progress
            const displayHeight = isPlaying 
              ? Math.max(4, wave.base + (Math.sin(currentTime * 10 + i) * wave.variance))
              : wave.base

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isActive 
                    ? (isOwn ? 'bg-white' : 'bg-primary') 
                    : (isOwn ? 'bg-white/30' : 'bg-muted-foreground/30')
                }`}
                style={{ 
                  height: `${displayHeight}%`,
                  opacity: isPlaying ? 1 : 0.6
                }}
              />
            )
          })}
        </div>
        
        <div className="shrink-0 text-[10px] font-mono opacity-80 min-w-[32px]">
          {isReady && duration > 0 ? formatTime(isPlaying ? currentTime : duration) : '--:--'}
        </div>
      </div>

      <div className="px-1 text-[10px] opacity-60 truncate font-medium">
        {fileName}
      </div>

      <audio
        ref={audioRef}
        src={isReady ? url : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
        preload="metadata"
      />
    </div>
  )
}
