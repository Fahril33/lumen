import { useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useTypingStore } from '@/stores/typing-store'
import { RealtimeChannel } from '@supabase/supabase-js'

const TYPING_TIMEOUT_MS = 3000
const EMPTY_ARRAY: TypingPresence[] = []

interface TypingPresence {
  user_id: string
  full_name: string
}

// Global reference counter and channel map to prevent "cannot add presence callbacks" error
const channelManager: Record<string, {
  channel: RealtimeChannel
  refCount: number
}> = {}

export function useTypingIndicator(chatId: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const typingUsers = useTypingStore(
    (s) => (chatId ? s.typingMap[chatId] : null) ?? EMPTY_ARRAY
  )
  const setTypingUsers = useTypingStore((s) => s.setTypingUsers)
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // Join/Manage the presence channel
  useEffect(() => {
    if (!chatId || !user) return

    if (!channelManager[chatId]) {
      const channel = supabase.channel(`typing:${chatId}`, {
        config: { presence: { key: user.id } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<TypingPresence>()
          const others: TypingPresence[] = []

          for (const [key, presences] of Object.entries(state)) {
            if (key === user.id) continue
            for (const p of presences) {
              others.push({ user_id: p.user_id, full_name: p.full_name })
            }
          }
          setTypingUsers(chatId, others)
        })
        .subscribe()
      
      channelManager[chatId] = { channel, refCount: 1 }
    } else {
      channelManager[chatId].refCount++
    }

    return () => {
      const entry = channelManager[chatId]
      if (entry) {
        entry.refCount--
        if (entry.refCount <= 0) {
          supabase.removeChannel(entry.channel)
          delete channelManager[chatId]
          setTypingUsers(chatId, [])
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [chatId, user, setTypingUsers])

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!user || !chatId || !channelManager[chatId]) return
      const { channel } = channelManager[chatId]

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (typing) {
        if (!isTypingRef.current) {
          isTypingRef.current = true
          channel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name ?? 'Someone',
          })
        }

        timeoutRef.current = setTimeout(() => {
          isTypingRef.current = false
          channel.untrack()
        }, TYPING_TIMEOUT_MS)
      } else {
        isTypingRef.current = false
        channel.untrack()
      }
    },
    [user, chatId]
  )

  const filteredTyping = useMemo(
    () => (typingUsers as TypingPresence[]).filter((t) => t.user_id !== user?.id),
    [typingUsers, user?.id]
  )

  return { typingUsers: filteredTyping, setTyping }
}
