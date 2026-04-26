import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FolderTreeNode } from './folder-tree-node.tsx'
import type { FolderTreeItem } from '@/types/database'


interface FolderTreeProps {
  items: FolderTreeItem[]
  searchQuery: string
  isLoading?: boolean
  onCreateFolder: (parentId: string | null) => void
  onCreateNote: (folderId: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onRenameNote: (id: string, title: string) => void
  onDeleteFolder: (id: string) => void
  onDeleteNote: (id: string) => void
  onToggleExpand: (id: string, expanded: boolean) => void
  onMoveItem: (itemId: string, itemType: 'folder' | 'note', newParentId: string | null) => void
  onReorderItems?: (updates: { id: string, type: 'folder' | 'note', sort_order: number }[]) => void
}

export function FolderTree({
  items,
  searchQuery,
  isLoading,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onRenameNote,
  onDeleteFolder,
  onDeleteNote,
  onToggleExpand,
  onMoveItem,
  onReorderItems,
}: FolderTreeProps) {
  const [activeItem, setActiveItem] = useState<FolderTreeItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const flatItems = useCallback(
    (items: FolderTreeItem[]): FolderTreeItem[] => {
      const result: FolderTreeItem[] = []
      const flatten = (list: FolderTreeItem[]) => {
        list.forEach((item) => {
          result.push(item)
          if (item.type === 'folder' && item.isExpanded) {
            flatten(item.children)
          }
        })
      }
      flatten(items)
      return result
    },
    []
  )

  const filteredItems = useCallback(
    (items: FolderTreeItem[]): FolderTreeItem[] => {
      if (!searchQuery) return items
      const query = searchQuery.toLowerCase()
      const filterTree = (list: FolderTreeItem[]): FolderTreeItem[] => {
        return list.reduce<FolderTreeItem[]>((acc, item) => {
          const matches = item.name.toLowerCase().includes(query)
          const filteredChildren = filterTree(item.children)
          if (matches || filteredChildren.length > 0) {
            acc.push({ ...item, children: filteredChildren, isExpanded: true })
          }
          return acc
        }, [])
      }
      return filterTree(items)
    },
    [searchQuery]
  )

  const displayItems = filteredItems(items)
  const flat = flatItems(displayItems)
  const ids = flat.map((i) => i.id)

  if (isLoading) {
    return (
      <div className="space-y-2 px-2 py-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 rounded-md px-2 py-2">
            <div className="h-4 w-4 animate-pulse rounded bg-muted/70" />
            <div
              className="h-4 animate-pulse rounded bg-muted/70"
              style={{ width: `${120 - Math.min(index * 6, 40)}px` }}
            />
          </div>
        ))}
      </div>
    )
  }

  function findItem(id: string, items: FolderTreeItem[]): FolderTreeItem | null {
    for (const item of items) {
      if (item.id === id) return item
      const found = findItem(id, item.children)
      if (found) return found
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const item = findItem(event.active.id as string, displayItems)
    setActiveItem(item)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveItem(null)

    if (!over || active.id === over.id) return

    const draggedItem = findItem(active.id as string, displayItems)
    const overItem = findItem(over.id as string, displayItems)

    if (!draggedItem || !overItem) return

    // If dropping a note onto a folder (and they aren't already in the same parent being reordered)
    // Or if we specifically want to nest:
    const isNesting = overItem.type === 'folder' && draggedItem.parentId !== overItem.id && overItem.id !== draggedItem.parentId

    if (isNesting) {
      onMoveItem(draggedItem.id, draggedItem.type, overItem.id)
    } else {
      // Reordering within the same parent (or alongside the target)
      const targetParentId = overItem.parentId
      
      if (draggedItem.parentId !== targetParentId) {
        // Move to new parent first
        onMoveItem(draggedItem.id, draggedItem.type, targetParentId)
      } else if (onReorderItems) {
        // Same parent, calculate new sort order
        function getChildren(pid: string | null, itemsList: FolderTreeItem[]): FolderTreeItem[] {
          if (pid === null) return itemsList
          const parent = findItem(pid, itemsList)
          return parent ? parent.children : []
        }

        const siblings = getChildren(targetParentId, items)
          .sort((a, b) => a.sortOrder - b.sortOrder)

        const filteredSiblings = siblings.filter(i => i.id !== draggedItem.id)
        const overIndex = filteredSiblings.findIndex(i => i.id === overItem.id)
        
        // Insert dragged item at the drop index
        if (overIndex !== -1) {
          // If dragging down, place after overItem. If dragging up, place before.
          // active.data.current?.sortable?.index could tell us direction, but DndKit closestCenter is usually accurate enough.
          filteredSiblings.splice(overIndex, 0, draggedItem)
        } else {
          filteredSiblings.push(draggedItem)
        }

        const updates = filteredSiblings.map((item, index) => ({
          id: item.id,
          type: item.type,
          sort_order: index * 10
        }))

        // Only send updates for items whose sort_order actually changed
        const changedUpdates = updates.filter(u => {
          const orig = siblings.find(s => s.id === u.id)
          return orig && orig.sortOrder !== u.sort_order
        })

        if (changedUpdates.length > 0) {
          onReorderItems(changedUpdates)
        }
      }
    }
  }

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-xs text-muted-foreground">
          {searchQuery ? 'No results found' : 'No files yet. Create a folder or note to get started.'}
        </p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {displayItems.map((item) => (
            <FolderTreeNode
              key={item.id}
              item={item}
              depth={0}
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
      </SortableContext>
      <DragOverlay>
        {activeItem && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-primary/30 rounded-lg shadow-xl text-sm">
            <span className="text-muted-foreground">{activeItem.type === 'folder' ? '📁' : '📄'}</span>
            <span className="font-medium">{activeItem.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
