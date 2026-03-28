import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatRequest, Profile } from '@/types/database'

type ChatRequestWithProfiles = ChatRequest & {
  sender: Profile
  recipient: Profile
}

type RecipientLookupResult =
  | { state: 'idle' }
  | { state: 'self' }
  | { state: 'not_found' }
  | { state: 'disabled' }
  | { state: 'available'; profile: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'> }

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function useChatRequests() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const chatRequestsQuery = useQuery({
    queryKey: ['chat_requests', user?.id],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('chat_requests') as any)
        .select('*, sender:profiles!sender_id(*), recipient:profiles!recipient_id(*)')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as ChatRequestWithProfiles[]
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`chat_requests:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests' }, (payload) => {
        const nextRow = payload.new as Partial<ChatRequest>
        const prevRow = payload.old as Partial<ChatRequest>
        const isRelated =
          nextRow.recipient_id === user.id ||
          nextRow.sender_id === user.id ||
          prevRow.recipient_id === user.id ||
          prevRow.sender_id === user.id

        if (!isRelated) return

        queryClient.invalidateQueries({ queryKey: ['chat_requests', user.id] })
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient, user])

  const respondToChatRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'accepted' | 'rejected' }) => {
      if (!user) throw new Error('Not authenticated')

      if (action === 'accepted') {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data, error } = await (supabase.rpc as any)('accept_chat_request', {
          p_request_id: requestId,
        })

        if (error) throw error
        return data as string
      }

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('chat_requests') as any)
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('recipient_id', user.id)

      if (error) throw error
      return null
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat_requests', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id] }),
      ])

      toast.success(variables.action === 'accepted' ? 'Chat request accepted' : 'Chat request rejected')
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  return {
    chatRequestsQuery,
    respondToChatRequestMutation,
  }
}

export function useCreateChatRequest() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const createChatRequestMutation = useMutation({
    mutationFn: async ({ username, message }: { username: string; message: string }) => {
      if (!user) throw new Error('Not authenticated')

      const normalizedUsername = normalizeUsername(username)
      const trimmedMessage = message.trim()

      if (!normalizedUsername) throw new Error('Username is required')
      if (!trimmedMessage) throw new Error('Initial message is required')

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.rpc as any)('create_chat_request', {
        p_recipient_username: normalizedUsername,
        p_initial_message: trimmedMessage,
      })

      if (error) throw error
      return data as string
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat_requests'] }),
        queryClient.invalidateQueries({ queryKey: ['chats'] }),
      ])
      toast.success('Chat request sent')
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  return { createChatRequestMutation }
}

export function useChatRequestRecipientLookup(username: string) {
  const user = useAuthStore((state) => state.user)
  const normalizedUsername = normalizeUsername(username)

  return useQuery({
    queryKey: ['chat_request_lookup', user?.id, normalizedUsername],
    queryFn: async () => {
      if (!normalizedUsername) return { state: 'idle' } as RecipientLookupResult

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('profiles') as any)
        .select('id, full_name, username, avatar_url, allow_anon_chat')
        .ilike('username', normalizedUsername)
        .limit(1)

      if (error) throw error

      const profile = data?.[0] as (Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'> & { allow_anon_chat?: boolean }) | undefined

      if (!profile) return { state: 'not_found' } as RecipientLookupResult
      if (profile.id === user?.id) return { state: 'self' } as RecipientLookupResult
      if (!profile.allow_anon_chat) return { state: 'disabled' } as RecipientLookupResult

      return {
        state: 'available',
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        },
      } as RecipientLookupResult
    },
    enabled: !!user && normalizedUsername.length >= 3,
  })
}
