import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { usePresenceStore } from '@/stores/presence-store'

/**
 * useGlobalPresence – Tracks online status of all users using Supabase Presence.
 * Should be called once at the app root level (e.g., in App.tsx or a layout wrapper).
 */
export function useGlobalPresence() {
  const user = useAuthStore((s) => s.user)
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers)

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineIds = new Set<string>(Object.keys(state))
        setOnlineUsers(onlineIds)
      })
      .on('presence', { event: 'join' }, () => {
        // User joined
      })
      .on('presence', { event: 'leave' }, () => {
        // User left
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, setOnlineUsers])
}
