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
  const previousMessagesCountRef = useRef(0)
  const wasNearBottomRef = useRef(true)
  const lastScrollUpdateRef = useRef(0)

  const getViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null
  }, [scrollAreaRef])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [bottomRef])

  const updateScrollState = useCallback((force = false) => {
    const viewport = getViewport()
    if (!viewport) return

    const now = Date.now()
    if (!force && now - lastScrollUpdateRef.current < 150) {
      return
    }
    lastScrollUpdateRef.current = now

    const nextDistance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    
    // Only update state if values actually changed enough to matter
    // This prevents unnecessary re-renders of the ChatRoom
    setDistanceFromBottom((prev) => (Math.abs(prev - nextDistance) > 10 ? nextDistance : prev))
    setIsAtBottom(nextDistance < 80)
    wasNearBottomRef.current = nextDistance < 80
  }, [getViewport])

  useEffect(() => {
    pendingInitialScrollChatIdRef.current = activeChatId ?? null
    previousMessagesCountRef.current = 0
    wasNearBottomRef.current = true
    lastScrollUpdateRef.current = 0
  }, [activeChatId])

  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return

    const handleScroll = () => updateScrollState()

    // Initial check - deferred to avoid cascading render warning
    requestAnimationFrame(() => updateScrollState(true))
    
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
      updateScrollState(true)
      pendingInitialScrollChatIdRef.current = null
    }, 50)

    return () => clearTimeout(timer)
  }, [activeChatId, isMessagesLoading, messagesCount, scrollToBottom, updateScrollState])

  useEffect(() => {
    if (!activeChatId || isMessagesLoading) return

    const previousCount = previousMessagesCountRef.current
    const hasNewMessages = messagesCount > previousCount
    previousMessagesCountRef.current = messagesCount

    if (!hasNewMessages || previousCount === 0 || !wasNearBottomRef.current) {
      return
    }

    const timer = setTimeout(() => {
      scrollToBottom('smooth')
      updateScrollState(true)
    }, 30)

    return () => clearTimeout(timer)
  }, [activeChatId, isMessagesLoading, messagesCount, scrollToBottom, updateScrollState])

  return {
    isAtBottom,
    distanceFromBottom,
    scrollToBottom,
  }
}
