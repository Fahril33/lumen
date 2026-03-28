import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

export interface ProfileFormValues {
  fullName: string
  username: string
  avatarUrl: string
  allowAnonChat: boolean
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function useProfileSettings() {
  const queryClient = useQueryClient()
  const { user, profile, updateProfile } = useAuth()

  const saveProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user) throw new Error('Not authenticated')

      const fullName = values.fullName.trim()
      const username = normalizeUsername(values.username)

      if (!fullName) {
        throw new Error('Full name is required')
      }

      if (username && !/^[a-z0-9._-]{3,24}$/.test(username)) {
        throw new Error('Username must be 3-24 characters and use only letters, numbers, dot, dash, or underscore')
      }

      if (username) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data: existing, error: existingError } = await (supabase.from('profiles') as any)
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .limit(1)

        if (existingError) throw existingError
        if (existing?.length) {
          throw new Error('Username is already taken')
        }
      }

      const { error } = await updateProfile({
        full_name: fullName,
        username: username || null,
        avatar_url: values.avatarUrl.trim() || null,
        allow_anon_chat: values.allowAnonChat,
      })

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['friendships'] }),
        queryClient.invalidateQueries({ queryKey: ['chats'] }),
        queryClient.invalidateQueries({ queryKey: ['chat_messages'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
        queryClient.invalidateQueries({ queryKey: ['messages'] }),
      ])
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Avatar must be smaller than 5MB')
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const path = `${user.id}/avatars/${Date.now()}_${safeName}`
      const { error } = await supabase.storage.from('chat-files').upload(path, file, {
        upsert: true,
      })

      if (error) throw error

      const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
      return data.publicUrl
    },
    onSuccess: () => {
      toast.success('Avatar uploaded')
    },
    onError: (error) => {
      toast.error((error as Error).message)
    },
  })

  return {
    profile,
    saveProfileMutation,
    uploadAvatarMutation,
  }
}
