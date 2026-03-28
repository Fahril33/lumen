import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNotesStore } from '@/stores/notes-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FolderTreeItem } from '@/types/database'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  MoreHorizontal,
  FolderPlus,
  FilePlus,
  Pencil,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderTreeNodeProps {
  item: FolderTreeItem
  depth: number
  onCreateFolder: (parentId: string | null) => void
  onCreateNote: (folderId: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onRenameNote: (id: string, title: string) => void
  onDeleteFolder: (id: string) => void
  onDeleteNote: (id: string) => void
  onToggleExpand: (id: string, expanded: boolean) => void
}

export function FolderTreeNode({
  item,
  depth,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onRenameNote,
  onDeleteFolder,
  onDeleteNote,
  onToggleExpand,
}: FolderTreeNodeProps) {
  const { activeNoteId, setActiveNoteId } = useNotesStore()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(item.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${depth * 16 + 4}px`,
  }

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenameValue(item.name)
      setIsRenaming(false)
      return
    }
    if (item.type === 'folder') {
      onRenameFolder(item.id, trimmed)
    } else {
      onRenameNote(item.id, trimmed)
    }
    setIsRenaming(false)
  }

  function handleClick() {
    if (item.type === 'folder') {
      onToggleExpand(item.id, !item.isExpanded)
    } else {
      setActiveNoteId(item.id)
    }
  }

  const isActive = item.type === 'note' && activeNoteId === item.id
  const isFolder = item.type === 'folder'

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'folder-tree-item group flex items-center gap-1 rounded-md pr-1 min-h-[30px]',
          isDragging && 'dragging opacity-40',
          isActive && 'bg-primary/15 text-primary',
          !isActive && !isDragging && 'hover:bg-accent/50'
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-60 hover:opacity-100! cursor-grab active:cursor-grabbing p-px shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>

        {/* Expand/collapse for folders */}
        {isFolder ? (
          <button
            onClick={() => onToggleExpand(item.id, !item.isExpanded)}
            className="p-0.5 shrink-0 cursor-pointer"
          >
            {item.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-[18px] shrink-0" />
        )}

        {/* Icon */}
        <span className="shrink-0">
          {isFolder ? (
            item.isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary/70" />
            ) : (
              <Folder className="w-4 h-4 text-primary/50" />
            )
          ) : (
            <FileText className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </span>

        {/* Name */}
        {isRenaming ? (
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setRenameValue(item.name); setIsRenaming(false) }
            }}
            className="h-6 text-xs px-1 py-0 border-primary/50 bg-transparent flex-1 min-w-0"
          />
        ) : (
          <button
            onClick={handleClick}
            className="flex-1 text-left text-xs font-medium truncate py-1 cursor-pointer min-w-0"
          >
            {item.name}
          </button>
        )}

        {/* Context menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {isFolder && (
                <>
                  <DropdownMenuItem onClick={() => onCreateFolder(item.id)}>
                    <FolderPlus className="w-3.5 h-3.5 mr-2" />
                    New Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateNote(item.id)}>
                    <FilePlus className="w-3.5 h-3.5 mr-2" />
                    New Note
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => { setRenameValue(item.name); setIsRenaming(true) }}>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => isFolder ? onDeleteFolder(item.id) : onDeleteNote(item.id)}
                className="text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children (recursive) */}
      {isFolder && item.isExpanded && item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onCreateFolder={onCreateFolder}
              onCreateNote={onCreateNote}
              onRenameFolder={onRenameFolder}
              onRenameNote={onRenameNote}
              onDeleteFolder={onDeleteFolder}
              onDeleteNote={onDeleteNote}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}
