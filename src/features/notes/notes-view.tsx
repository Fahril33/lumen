import { useEffect, useRef } from 'react'
import { useTeamStore } from '@/stores/team-store'
import { useNotesStore } from '@/stores/notes-store'
import { useFolders } from '@/hooks/use-notes'
import { AdaptiveFeatureLayout } from '@/components/layout/adaptive-feature-layout'
import { FolderTree } from '@/components/notes/folder-tree'
import { NoteEditor } from '@/components/notes/note-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderPlus, FilePlus, Search, FileText } from 'lucide-react'

export function NotesView() {
  const { currentTeam } = useTeamStore()
  const { activeNoteId, searchQuery, setActiveNoteId, setSearchQuery } = useNotesStore()
  const previousTeamIdRef = useRef(currentTeam?.id)

  // Reset active note and search when switching teams
  useEffect(() => {
    if (previousTeamIdRef.current !== currentTeam?.id) {
      setActiveNoteId(null)
      setSearchQuery('')
    }
    previousTeamIdRef.current = currentTeam?.id
  }, [currentTeam?.id, setActiveNoteId, setSearchQuery])
  const {
    foldersQuery,
    notesQuery,
    tree,
    createFolderMutation,
    createNoteMutation,
    updateFolderMutation,
    deleteFolderMutation,
    updateNoteMutation,
    deleteNoteMutation,
  } = useFolders(currentTeam?.id)

  const isTreeLoading = foldersQuery.isLoading || notesQuery.isLoading

  // If active note is deleted or no longer in the tree, clear it
  useEffect(() => {
    if (!activeNoteId || isTreeLoading) return
    const findNote = (items: typeof tree): boolean => {
      for (const item of items) {
        if (item.id === activeNoteId && item.type === 'note') return true
        if (item.children) {
          if (findNote(item.children)) return true
        }
      }
      return false
    }
    if (!findNote(tree)) {
      setActiveNoteId(null)
    }
  }, [tree, activeNoteId, isTreeLoading, setActiveNoteId])

  if (!currentTeam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Select a team to access notes</p>
        </div>
      </div>
    )
  }

  return (
    <AdaptiveFeatureLayout
      secondary={
      <div
        className="that flex h-full w-full flex-col"
      >
        {/* Search & actions */}
        <div className="this p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted/50 border-none"
              disabled={isTreeLoading}
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs gap-1.5"
              onClick={() => createFolderMutation.mutate({ name: 'New Folder' })}
              disabled={isTreeLoading}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs gap-1.5"
              onClick={() => createNoteMutation.mutate({}, { onSuccess: (data) => setActiveNoteId(data.id) })}
              disabled={isTreeLoading}
            >
              <FilePlus className="w-3.5 h-3.5" />
              Note
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <FolderTree
              items={tree}
              searchQuery={searchQuery}
              isLoading={isTreeLoading}
              onCreateFolder={(parentId) => createFolderMutation.mutate({ name: 'New Folder', parentId })}
              onCreateNote={(folderId) => createNoteMutation.mutate({ folderId }, { onSuccess: (data) => setActiveNoteId(data.id) })}
              onRenameFolder={(id, name) => updateFolderMutation.mutate({ id, updates: { name } })}
              onRenameNote={(id, title) => updateNoteMutation.mutate({ id, updates: { title } })}
              onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
              onDeleteNote={(id) => deleteNoteMutation.mutate(id)}
              onToggleExpand={(id, expanded) => updateFolderMutation.mutate({ id, updates: { is_expanded: expanded } })}
              onMoveItem={(itemId, itemType, newParentId) => {
                if (itemType === 'folder') {
                  updateFolderMutation.mutate({ id: itemId, updates: { parent_id: newParentId } })
                } else {
                  updateNoteMutation.mutate({ id: itemId, updates: { folder_id: newParentId } })
                }
              }}
              onReorderItems={(updates) => {
                updates.forEach(u => {
                  if (u.type === 'folder') {
                    updateFolderMutation.mutate({ id: u.id, updates: { sort_order: u.sort_order } })
                  } else {
                    updateNoteMutation.mutate({ id: u.id, updates: { sort_order: u.sort_order } })
                  }
                })
              }}
            />
          </div>
        </ScrollArea>
      </div>
      }
      detail={
        <div className="notes-editor-container-main flex flex-col h-full overflow-hidden">
          {activeNoteId ? (
            <NoteEditor key={activeNoteId} noteId={activeNoteId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                {isTreeLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-primary/50" />
                    </div>
                    <p className="text-muted-foreground text-sm">Select or create a note to start editing</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      }
      showDetail={!!activeNoteId}
      onBack={() => setActiveNoteId(null)}
      detailTitle="Note"
      secondaryWidthClassName="w-[clamp(19rem,26vw,24rem)]"
      secondaryClassName="bg-card/30"
    />
  )
}
