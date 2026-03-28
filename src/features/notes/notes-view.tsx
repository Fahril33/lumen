import { useState } from 'react'
import { useTeamStore } from '@/stores/team-store'
import { useNotesStore } from '@/stores/notes-store'
import { useFolders } from '@/hooks/use-notes'
import { FolderTree } from '@/components/notes/folder-tree'
import { NoteEditor } from '@/components/notes/note-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderPlus, FilePlus, Search, FileText } from 'lucide-react'

export function NotesView() {
  const { currentTeam } = useTeamStore()
  const { activeNoteId, searchQuery, setSearchQuery } = useNotesStore()
  const {
    tree,
    createFolderMutation,
    createNoteMutation,
    updateFolderMutation,
    deleteFolderMutation,
    updateNoteMutation,
    deleteNoteMutation,
  } = useFolders(currentTeam?.id)

  const [treeWidth] = useState(300)

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
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Folder tree sidebar */}
      <div
        className="flex flex-col border-r border-border bg-card/30"
        style={{ width: treeWidth }}
      >
        {/* Search & actions */}
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted/50 border-none"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs gap-1.5"
              onClick={() => createFolderMutation.mutate({ name: 'New Folder' })}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs gap-1.5"
              onClick={() => createNoteMutation.mutate({})}
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
              onCreateFolder={(parentId) => createFolderMutation.mutate({ name: 'New Folder', parentId })}
              onCreateNote={(folderId) => createNoteMutation.mutate({ folderId })}
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
            />
          </div>
        </ScrollArea>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeNoteId ? (
          <NoteEditor noteId={activeNoteId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-primary/50" />
              </div>
              <p className="text-muted-foreground text-sm">Select or create a note to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
