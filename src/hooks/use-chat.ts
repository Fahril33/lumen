import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'
import type { Channel } from '@/types/database'
import type { MessageWithProfile } from '@/types/database'
import { toast } from 'sonner'

export function useChannels(teamId: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const { setCurrentChannel } = useTeamStore()
  const queryClient = useQueryClient()

  const channelsQuery = useQuery({
    queryKey: ['channels', teamId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('channels') as any)
        .select('*')
        .eq('team_id', teamId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Channel[]
    },
    enabled: !!teamId,
  })

  const createChannelMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('channels') as any)
        .insert({
          team_id: teamId!,
          name,
          description: description ?? '',
          created_by: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['channels', teamId] })
      setCurrentChannel(data)
      toast.success(`#${data.name} created`)
    },
  })

  return { channelsQuery, createChannelMutation }
}

export function useMessages(channelId: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const messagesQuery = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('messages') as any)
        .select('*, profiles(*)')
        .eq('channel_id', channelId!)
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) throw error
      return data as MessageWithProfile[]
    },
    enabled: !!channelId,
  })

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { data: profile } = await (supabase.from('profiles') as any)
            .select('*')
            .eq('id', payload.new.user_id)
            .single()
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const newMsg = { ...payload.new, profiles: profile } as any as MessageWithProfile
          queryClient.setQueryData<MessageWithProfile[]>(
            ['messages', channelId],
            (old) => [...(old ?? []), newMsg]
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          queryClient.setQueryData<MessageWithProfile[]>(
            ['messages', channelId],
            (old) => (old ?? []).filter((m) => m.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [channelId, queryClient])

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      fileUrl,
      fileName,
      fileType,
    }: {
      content: string
      fileUrl?: string
      fileName?: string
      fileType?: string
    }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('messages') as any).insert({
        channel_id: channelId!,
        user_id: user!.id,
        content,
        file_url: fileUrl ?? null,
        file_name: fileName ?? null,
        file_type: fileType ?? null,
      })
      if (error) throw error
    },
  })

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('messages') as any).delete().eq('id', messageId)
      if (error) throw error
    },
  })

  const uploadFile = useCallback(
    async (file: File) => {
      const path = `${user!.id}/${channelId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('chat-files').upload(path, file)
      if (error) throw error
      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-files').getPublicUrl(path)
      return { url: publicUrl, name: file.name, type: file.type }
    },
    [user, channelId]
  )

  return { messagesQuery, sendMessageMutation, deleteMessageMutation, uploadFile }
}
