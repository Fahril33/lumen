import { useState, useEffect, useCallback, useRef, type RefObject } from 'react'

export function useChatScroll(
  scrollAreaRef: RefObject<HTMLDivElement | null>,
  bottomRef: RefObject<HTMLDivElement | null>,
  activeChatId: string | undefined,
  messagesCount: number,
  isMessagesLoading: boolean
) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [distanceFromBottom, setDistanceFromBottom] = useState(0)
  const pendingInitialScrollChatIdRef = useRef<string | null>(null)

  const getViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null
  }, [scrollAreaRef])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [bottomRef])

  const updateScrollState = useCallback(() => {
    const viewport = getViewport()
    if (!viewport) return

    const nextDistance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setDistanceFromBottom(nextDistance)
    setIsAtBottom(nextDistance < 80)
  }, [getViewport])

  useEffect(() => {
    pendingInitialScrollChatIdRef.current = activeChatId ?? null
  }, [activeChatId])

  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return

    const handleScroll = () => updateScrollState()

    handleScroll()
    viewport.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [activeChatId, messagesCount, getViewport, updateScrollState])

  useEffect(() => {
    if (!activeChatId || isMessagesLoading) return
    if (pendingInitialScrollChatIdRef.current !== activeChatId) return

    const timer = setTimeout(() => {
      scrollToBottom('instant' as ScrollBehavior)
      updateScrollState()
      pendingInitialScrollChatIdRef.current = null
    }, 50)

    return () => clearTimeout(timer)
  }, [activeChatId, isMessagesLoading, messagesCount, scrollToBottom, updateScrollState])

  return {
    isAtBottom,
    distanceFromBottom,
    scrollToBottom,
  }
}
