import React, { useRef, useEffect, useCallback } from 'react'
import { EMOJI_REGEX } from './link-preview'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  className?: string
  onFocus?: () => void
}

export function ChatInput({ value, onChange, onSend, placeholder, className, onFocus }: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)

  // Sync state to DOM
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const html = value.split(EMOJI_REGEX).map(part => {
        if (part.match(EMOJI_REGEX)) {
          const codePoints = Array.from(part).map(c => c.codePointAt(0)?.toString(16)).join('-')
          const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${codePoints}.png`
          return `<img src="${url}" alt="${part}" class="inline-block w-[1.2em] h-[1.2em] align-text-bottom mx-[0.05em] select-all" data-emoji="${part}" />`
        }
        return part
      }).join('')
      
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html
      }
    }
    isInternalUpdate.current = false
  }, [value])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    
    // Extract text from contenteditable, replacing img tags with their alt (emoji char)
    const container = document.createElement('div')
    container.innerHTML = editorRef.current.innerHTML
    
    const imgs = container.querySelectorAll('img[data-emoji]')
    imgs.forEach(img => {
      const emoji = img.getAttribute('data-emoji')
      if (emoji) img.replaceWith(emoji)
    })
    
    const text = container.innerText || container.textContent || ''
    isInternalUpdate.current = true
    onChange(text)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div className="relative flex-1 flex items-center">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={onFocus}
        className={`flex-1 outline-none overflow-y-auto max-h-32 min-h-[44px] flex items-center px-2 py-2.5 text-[15px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 ${className}`}
        data-placeholder={placeholder}
      />
    </div>
  )
}
