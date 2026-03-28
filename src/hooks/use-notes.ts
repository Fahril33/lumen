import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Folder, Note } from '@/types/database'
import type { FolderTreeItem } from '@/types/database'
import { toast } from 'sonner'

export function useFolders(teamId: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const foldersQuery = useQuery({
    queryKey: ['folders', teamId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('folders') as any)
        .select('*')
        .eq('team_id', teamId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Folder[]
    },
    enabled: !!teamId,
  })

  const notesQuery = useQuery({
    queryKey: ['notes', teamId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('notes') as any)
        .select('*')
        .eq('team_id', teamId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Note[]
    },
    enabled: !!teamId,
  })

  // Realtime for folders
  useEffect(() => {
    if (!teamId) return
    const channel = supabase
      .channel(`folders:${teamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folders',
        filter: `team_id=eq.${teamId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['folders', teamId] })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `team_id=eq.${teamId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notes', teamId] })
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [teamId, queryClient])

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('folders') as any)
        .insert({
          team_id: teamId!,
          name,
          parent_id: parentId ?? null,
          created_by: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', teamId] })
      toast.success('Folder created')
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Folder> }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('folders') as any).update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', teamId] })
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('folders') as any).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', teamId] })
      toast.success('Folder deleted')
    },
  })

  const createNoteMutation = useMutation({
    mutationFn: async ({ title, folderId }: { title?: string; folderId?: string | null }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('notes') as any)
        .insert({
          team_id: teamId!,
          title: title ?? 'Untitled',
          folder_id: folderId ?? null,
          content: {},
          created_by: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] })
      toast.success('Note created')
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('notes') as any)
        .update({ ...updates, updated_by: user!.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] })
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('notes') as any).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] })
      toast.success('Note deleted')
    },
  })

  // Build tree structure from flat data
  function buildTree(folders: Folder[], notes: Note[]): FolderTreeItem[] {
    const folderItems: FolderTreeItem[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      parentId: f.parent_id,
      sortOrder: f.sort_order,
      isExpanded: f.is_expanded,
      children: [],
      data: f,
    }))

    const noteItems: FolderTreeItem[] = notes.map((n) => ({
      id: n.id,
      name: n.title,
      type: 'note' as const,
      parentId: n.folder_id,
      sortOrder: n.sort_order,
      children: [],
      data: n,
    }))

    const allItems = [...folderItems, ...noteItems]
    const itemMap = new Map<string, FolderTreeItem>()
    allItems.forEach((item) => itemMap.set(item.id, item))

    const roots: FolderTreeItem[] = []
    allItems.forEach((item) => {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.children.push(item)
      } else {
        roots.push(item)
      }
    })

    // Sort children
    const sortChildren = (items: FolderTreeItem[]) => {
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.sortOrder - b.sortOrder
      })
      items.forEach((item) => sortChildren(item.children))
    }
    sortChildren(roots)

    return roots
  }

  const tree = buildTree(foldersQuery.data ?? [], notesQuery.data ?? [])

  return {
    foldersQuery,
    notesQuery,
    tree,
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
  }
}

export function useNote(noteId: string | undefined) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const noteQuery = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data, error } = await (supabase.from('notes') as any)
        .select('*')
        .eq('id', noteId!)
        .single()
      if (error) throw error
      return data as Note
    },
    enabled: !!noteId,
  })

  // Realtime for single note content
  useEffect(() => {
    if (!noteId) return
    const channel = supabase
      .channel(`note:${noteId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notes',
        filter: `id=eq.${noteId}`,
      }, (payload) => {
        // Only update if another user changed it
        if (payload.new.updated_by !== user?.id) {
          queryClient.setQueryData(['note', noteId], payload.new)
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [noteId, user?.id, queryClient])

  const saveNoteMutation = useMutation({
    mutationFn: async ({ title, content }: { title?: string; content?: Record<string, unknown> }) => {
      const updates: Record<string, unknown> = { updated_by: user!.id }
      if (title !== undefined) updates.title = title
      if (content !== undefined) updates.content = content
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { error } = await (supabase.from('notes') as any).update(updates).eq('id', noteId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    },
  })

  return { noteQuery, saveNoteMutation }
}
