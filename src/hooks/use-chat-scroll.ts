import { useState, useEffect, type RefObject } from 'react'

export function useChatScroll(
  bottomRef: RefObject<HTMLDivElement | null>,
  activeChatId: string | undefined,
  messagesCount: number,
  markAsRead: () => void
) {
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Track if user is at the bottom of the chat view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        // As long as the bottom ref is slightly visible, consider it 'at bottom'
        setIsAtBottom(entry.isIntersecting)
      },
      { 
        root: null, 
        rootMargin: '0px 0px 50px 0px', // Trigger even if 50px away from bottom
        threshold: 0 
      }
    )

    if (bottomRef.current) {
      observer.observe(bottomRef.current)
    }

    return () => observer.disconnect()
  }, [bottomRef])

  // 1. Initial Load: When user opens a new chat, force scroll to bottom and mark as read immediately
  useEffect(() => {
    if (activeChatId) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        markAsRead()
      }, 50) // Tiny delay to ensure DOM is painted
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId])

  // 2. Incoming Messages or Manual Scroll Down: 
  // If the user receives a message while at the bottom, OR scrolls to the bottom
  useEffect(() => {
    if (activeChatId && isAtBottom && messagesCount > 0) {
      // Small timeout to let React render the new message before scrolling down
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        markAsRead()
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesCount, isAtBottom, activeChatId])

  return { isAtBottom }
}
