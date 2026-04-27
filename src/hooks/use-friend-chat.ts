import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessageWithProfile } from '@/types/database'
import { toast } from 'sonner'

interface ChatListMessagePreview {
  id: string
  user_id: string
  content: string
  created_at: string
  status?: 'sent' | 'received' | 'read'
  message_kind?: 'standard' | 'request_intro'
}

interface ChatListItem {
  id: string
  unread_count?: number
  messages?: ChatListMessagePreview[]
}

interface ChatMessagesPage {
  items: ChatMessageWithProfile[]
  nextCursor: string | null
}

const CHAT_MESSAGES_PAGE_SIZE = 100

const CHAT_LIST_SELECT = `
  *,
  participants:chat_participants(profiles(*)),
  messages:chat_messages(id, user_id, content, created_at, status, message_kind)
`

function coerceReactions(value: unknown): Record<string, string[]> {
  if (!value) return {}

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return {}
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const obj = parsed as Record<string, unknown>
  const out: Record<string, string[]> = {}

  for (const [emoji, users] of Object.entries(obj)) {
    if (!emoji) continue
    if (!Array.isArray(users)) continue
    const userIds = users.filter((u): u is string => typeof u === 'string')
    if (userIds.length === 0) continue
    out[emoji] = Array.from(new Set(userIds))
  }

  return out
}

function toggleReactionLocal(current: unknown, userId: string, emoji: string) {
  const reactions = coerceReactions(current)
  const normalizedEmoji = emoji.trim()
  if (!normalizedEmoji) return reactions

  let currentEmoji: string | null = null
  for (const [key, userIds] of Object.entries(reactions)) {
    if (userIds.includes(userId)) {
      currentEmoji = key
      break
    }
  }

  // Remove user from all reactions first
  for (const key of Object.keys(reactions)) {
    reactions[key] = reactions[key]!.filter((id) => id !== userId)
    if (reactions[key]!.length === 0) delete reactions[key]
  }

  // Toggle off if same emoji
  if (currentEmoji === normalizedEmoji) return reactions

  // Otherwise add to the new emoji
  const existing = reactions[normalizedEmoji] ?? []
  reactions[normalizedEmoji] = Array.from(new Set([...existing, userId]))
  return reactions
}

async function fetchUnreadMap(userId: string) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: unreadData, error } = await (supabase.from('chat_messages') as any)
    .select('chat_id')
    .neq('status', 'read')
    .neq('user_id', userId)

  if (error) throw error

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (unreadData ?? []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.chat_id] = (acc[row.chat_id] || 0) + 1
    return acc
  }, {})
}

async function fetchChatsForUser(userId: string) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from('chats') as any)
    .select(CHAT_LIST_SELECT)
    .order('created_at', { referencedTable: 'chat_messages', ascending: false })
    .limit(1, { referencedTable: 'chat_messages' })
    .order('updated_at', { ascending: false })

  if (error) throw error

  const unreadMap = await fetchUnreadMap(userId)

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data as any[]).map((chat) => ({
    ...chat,
    unread_count: unreadMap[chat.id] || 0,
  }))
}

async function fetchChatById(chatId: string, userId: string) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from('chats') as any)
    .select(CHAT_LIST_SELECT)
    .eq('id', chatId)
    .single()

  if (error) throw error

  const unreadMap = await fetchUnreadMap(userId)

  return {
    ...data,
    unread_count: unreadMap[chatId] || 0,
  }
}

async function fetchChatMessagesPage(chatId: string, cursor?: string | null) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let query = (supabase.from('chat_messages') as any)
    .select('*, profiles!user_id(*), reply_to:reply_to_id(*, profiles!user_id(*))')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(CHAT_MESSAGES_PAGE_SIZE)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query
  if (error) throw error

  const items = (data ?? []) as ChatMessageWithProfile[]
  return {
    items,
    nextCursor:
      items.length === CHAT_MESSAGES_PAGE_SIZE
        ? items[items.length - 1]?.created_at ?? null
        : null,
  } satisfies ChatMessagesPage
}

export function useFriendships() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const friendshipsQuery = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('friendships') as any)
        .select('*, requester:profiles!requester_id(*), recipient:profiles!recipient_id(*)')
        .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const sendFriendRequest = useMutation({
    mutationFn: async (username: string) => {
      // Find user
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: profile, error: profileErr } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('username', username)
        .single()
      
      if (profileErr || !profile) throw new Error('User not found')

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('friendships') as any)
        .insert({
          requester_id: user!.id,
          recipient_id: profile.id,
          status: 'pending'
        })
        .select()
        .single()
      
      if (error) {
        if (error.code === '23505') throw new Error('Friend request already sent')
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] })
      toast.success('Friend request sent')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    }
  })

  const updateFriendship = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'accepted' | 'blocked' }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('friendships') as any)
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', user?.id] })
    }
  })

  return { friendshipsQuery, sendFriendRequest, updateFriendship }
}

export function useChats() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const chatsQuery = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: async () => fetchChatsForUser(user!.id),
    enabled: !!user,
  })


  const createChat = useMutation({
    mutationFn: async ({ participantIds, isGroup, name }: { participantIds: string[], isGroup: boolean, name?: string }) => {
      if (!user) {
        throw new Error('Not authenticated')
      }

      if (!isGroup && participantIds.length === 1) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data: chatId, error } = await (supabase.rpc as any)('ensure_direct_chat', {
          p_other_user_id: participantIds[0],
        })

        if (error) throw error

        return fetchChatById(chatId, user.id)
      }

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: chat, error: chatErr } = await (supabase.from('chats') as any)
        .insert({
          is_group: isGroup,
          name: name ?? null,
          created_by: user.id
        })
        .select()
        .single()
      if (chatErr) throw chatErr

      const participants = [...new Set([...participantIds, user.id])].map(id => ({
        chat_id: chat.id,
        user_id: id
      }))

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error: partErr } = await (supabase.from('chat_participants') as any)
        .insert(participants)
      if (partErr) throw partErr

      return fetchChatById(chat.id, user.id)
    },
    onSuccess: (chat) => {
      queryClient.setQueryData<ChatListItem[]>(
        ['chats', user?.id],
        (current) => {
          const deduped = (current ?? []).filter((existing) => existing.id !== chat.id)
          return [chat, ...deduped]
        }
      )
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] })
    }
  })

  return { chatsQuery, createChat }
}

export function useGlobalChatListener() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Realtime subscription for chats and tracking online presence globally
  useEffect(() => {
    if (!user) return
    
    // As soon as the user opens the app, tell the DB we received all pending messages
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    ;(supabase.rpc as any)('mark_user_messages_received').then()

    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: /* eslint-disable-line @typescript-eslint/no-explicit-any */ any) => {
        // Only invalidate if the message isn't from us
        if (payload.new.user_id !== user.id) {
          // If we are online and receive a message, instantly flag it as 'received' in the DB
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          ;(supabase.rpc as any)('mark_user_messages_received').then()
          queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
          queryClient.invalidateQueries({ queryKey: ['chat_messages', payload.new.chat_id] })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload: /* eslint-disable-line @typescript-eslint/no-explicit-any */ any) => {
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
        queryClient.invalidateQueries({ queryKey: ['chat_messages', payload.new.chat_id] })
      })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [user, queryClient])
}

export function useChatMessages(chatId: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const messagesQuery = useInfiniteQuery({
    queryKey: ['chat_messages', chatId],
    queryFn: async ({ pageParam }) => fetchChatMessagesPage(chatId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!chatId,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages ?? [])
        .slice()
        .reverse()
        .flatMap((page) => [...page.items].reverse()),
    [messagesQuery.data?.pages]
  )

  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`chat_messages:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { data } = await (supabase.from('chat_messages') as any)
            .select('*, profiles!user_id(*), reply_to:reply_to_id(*, profiles!user_id(*))')
            .eq('id', payload.new.id)
            .maybeSingle()

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newMsg = ((data ?? payload.new) as any) as ChatMessageWithProfile
          
          // Play notification sound if not muted and message is from someone else
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { isMuted } = (window as any).appShellStore?.getState?.() || { isMuted: false }
          if (!isMuted && newMsg.user_id !== user?.id) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')
            audio.volume = 0.4
            audio.play().catch(() => {})
          }

          queryClient.setQueryData(
            ['chat_messages', chatId],
            (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
              if (!old) {
                return {
                  pages: [{ items: [newMsg], nextCursor: null }],
                  pageParams: [null],
                }
              }
              if (old.pages.some((page) => page.items.some((message) => message.id === newMsg.id))) {
                return old
              }

              const [firstPage, ...restPages] = old.pages
              if (!firstPage) {
                return {
                  pages: [{ items: [newMsg], nextCursor: null }],
                  pageParams: [null],
                }
              }

              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    items: [newMsg, ...firstPage.items],
                  },
                  ...restPages,
                ],
              }
            }
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          queryClient.setQueryData(
            ['chat_messages', chatId],
            (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
              if (!old) return old

              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((message) => message.id !== payload.old.id),
                })),
              }
            }
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          queryClient.setQueryData(
            ['chat_messages', chatId],
            (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
              if (!old) return old

              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((message) =>
                    message.id === payload.new.id ? { ...message, ...payload.new } : message
                  ),
                })),
              }
            }
          )
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [chatId, queryClient, user?.id])

  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, fileUrl, fileName, fileType }: { content: string, replyToId?: string, fileUrl?: string, fileName?: string, fileType?: string }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('chat_messages') as any).insert({
        chat_id: chatId!,
        user_id: user!.id,
        content,
        reply_to_id: replyToId ?? null,
        file_url: fileUrl ?? null,
        file_name: fileName ?? null,
        file_type: fileType ?? null
      }).select('*, profiles!user_id(*), reply_to:reply_to_id(*, profiles!user_id(*))').single()

      if (error) throw error
      return data as ChatMessageWithProfile
    },
    onSuccess: (newMsg) => {
      if (!newMsg) return
      
      // Play send sound if not muted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { isMuted } = (window as any).appShellStore?.getState?.() || { isMuted: false }
      if (!isMuted) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {})
      }

      queryClient.setQueryData(
        ['chat_messages', chatId],
        (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
          if (!old) {
            return {
              pages: [{ items: [newMsg], nextCursor: null }],
              pageParams: [null],
            }
          }

          if (old.pages.some((page) => page.items.some((message) => message.id === newMsg.id))) {
            return old
          }

          const [firstPage, ...restPages] = old.pages
          if (!firstPage) {
            return {
              pages: [{ items: [newMsg], nextCursor: null }],
              pageParams: [null],
            }
          }

          return {
            ...old,
            pages: [
              {
                ...firstPage,
                items: [newMsg, ...firstPage.items],
              },
              ...restPages,
            ],
          }
        }
      )
    }
  })

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('chat_messages') as any)
        .update({ content, is_edited: true })
        .eq('id', messageId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
    },
  })

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('chat_messages') as any)
        .update({ is_deleted: true, content: '' })
        .eq('id', messageId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] })
    },
  })

  const toggleStar = useMutation({
    mutationFn: async ({ messageId, starred }: { messageId: string; starred: boolean }) => {
      if (starred) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { error } = await (supabase.from('starred_messages') as any)
          .delete()
          .eq('user_id', user!.id)
          .eq('message_id', messageId)
        if (error) throw error
      } else {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { error } = await (supabase.from('starred_messages') as any)
          .insert({ user_id: user!.id, message_id: messageId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['starred_messages', chatId] })
    },
  })

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated')
      const normalizedEmoji = emoji.trim()
      if (!normalizedEmoji) throw new Error('Invalid emoji')

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.rpc as any)('toggle_chat_message_reaction', {
        p_message_id: messageId,
        p_emoji: normalizedEmoji,
      })

      if (error) throw error
      return { messageId, reactions: data as unknown }
    },
    onMutate: async ({ messageId, emoji }) => {
      if (!chatId || !user) return

      await queryClient.cancelQueries({ queryKey: ['chat_messages', chatId] })
      const previousMessages = queryClient.getQueryData(['chat_messages', chatId])

      queryClient.setQueryData(
        ['chat_messages', chatId],
        (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((message) => {
                if (message.id !== messageId) return message
                return {
                  ...message,
                  reactions: toggleReactionLocal(message.reactions, user.id, emoji),
                }
              }),
            })),
          }
        }
      )

      return { previousMessages }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _variables, context) => {
      if (!chatId || !context) return
      queryClient.setQueryData(['chat_messages', chatId], context.previousMessages)
      const message =
        [err?.message, err?.details, err?.hint, err?.code ? `(${err.code})` : null]
          .filter(Boolean)
          .join(' ') || 'Failed to react to message'
      toast.error(message)
      console.error('toggle_chat_message_reaction failed', err)
    },
    onSuccess: ({ messageId, reactions }) => {
      if (!chatId) return
      if (!reactions) return

      const nextReactions = coerceReactions(reactions)

      queryClient.setQueryData(
        ['chat_messages', chatId],
        (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((message) =>
                message.id === messageId ? { ...message, reactions: nextReactions } : message
              ),
            })),
          }
        }
      )
    },
  })

  const uploadFile = useCallback(
    async (file: File) => {
      const path = `${user!.id}/${chatId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('chat-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path)
      return { url: publicUrl, name: file.name, type: file.type }
    },
    [user, chatId]
  )

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!chatId || !user) return
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      await (supabase.rpc as any)('mark_chat_messages_read', { p_chat_id: chatId })
    },
    onMutate: async () => {
      if (!chatId || !user) return

      const previousMessages = queryClient.getQueryData(['chat_messages', chatId])
      const previousChats = queryClient.getQueryData<ChatListItem[]>(['chats', user.id])

      queryClient.setQueryData(
        ['chat_messages', chatId],
        (old: { pages: ChatMessagesPage[]; pageParams: Array<string | null> } | undefined) => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((message) =>
                message.user_id !== user.id && message.status !== 'read'
                  ? { ...message, status: 'read' as const }
                  : message
              ),
            })),
          }
        }
      )

      queryClient.setQueryData<ChatListItem[]>(
        ['chats', user.id],
        (old) => (old ?? []).map((chat) => {
          if (chat.id !== chatId) return chat

          const nextMessages = (chat.messages ?? []).map((message) =>
            message.user_id !== user.id && message.status !== 'read'
              ? { ...message, status: 'read' as const }
              : message
          )

          return {
            ...chat,
            unread_count: 0,
            messages: nextMessages,
          }
        })
      )

      return { previousMessages, previousChats }
    },
    onError: (_error, _variables, context) => {
      if (!chatId || !user || !context) return

      queryClient.setQueryData(['chat_messages', chatId], context.previousMessages)
      queryClient.setQueryData(['chats', user.id], context.previousChats)
    },
    onSuccess: () => {
      setTimeout(() => {
         queryClient.invalidateQueries({ queryKey: ['chats', user?.id] })
      }, 100)
    }
  })

  return {
    messagesQuery,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleStar,
    toggleReaction,
    uploadFile,
    markAsRead,
    fetchOlderMessages: messagesQuery.fetchNextPage,
    hasOlderMessages: messagesQuery.hasNextPage,
    isFetchingOlderMessages: messagesQuery.isFetchingNextPage,
  }
}

export function useStarredMessages(chatId: string | undefined) {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['starred_messages', chatId],
    queryFn: async () => {
      if (!chatId || !user) return new Set<string>()

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('starred_messages') as any)
        .select('message_id')
        .eq('user_id', user.id)

      if (error) throw error
      return new Set<string>((data as { message_id: string }[]).map((row) => row.message_id))
    },
    enabled: !!chatId && !!user,
  })
}
