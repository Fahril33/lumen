import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { useNote } from '@/hooks/use-notes'
import { normalizeTiptapContent } from '@/lib/tiptap-content'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatRelativeTime } from '@/lib/utils'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  Highlighter,
  Undo,
  Redo,
  Minus,
  Save,
  Clock,
  Check,
} from 'lucide-react'
import { AiToolbarButton } from './ai-toolbar-button'
import type { JSONContent } from '@tiptap/react'

interface NoteEditorProps {
  noteId: string
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { noteQuery, saveNoteMutation } = useNote(noteId)
  const note = noteQuery.data
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Track the current noteId in a ref so debounced callbacks always target the correct note
  const activeNoteIdRef = useRef(noteId)
  const normalizedContent = normalizeTiptapContent(note?.content)

  // Force toolbar re-render on selection/transaction changes
  const [, setToolbarTick] = useState(0)

  // Autosave toggle state
  const [autoSave, setAutoSave] = useState(true)
  // Track whether there are unsaved changes (only relevant when autosave is off)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Keep activeNoteIdRef in sync
  useEffect(() => {
    activeNoteIdRef.current = noteId
  }, [noteId])

  // Clear any pending save when noteId changes (prevents stale saves to wrong note)
  useEffect(() => {
    setHasUnsavedChanges(false)
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = undefined
      }
    }
  }, [noteId])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Highlight,
    ],
    content: normalizedContent,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      // Check autoSave state via a closure-safe approach (read from DOM or ref won't work,
      // but since useEditor recreates on [noteId], the latest autoSave is captured)
      // We use a ref-based approach below instead
      const shouldAutoSave = autoSaveRef.current

      if (shouldAutoSave) {
        // Debounced auto-save
        saveTimeoutRef.current = setTimeout(() => {
          if (activeNoteIdRef.current === noteId) {
            saveNoteMutation.mutate({ content: ed.getJSON() as Record<string, unknown> })
          }
        }, 1000)
      } else {
        // Mark as dirty
        setHasUnsavedChanges(true)
      }
    },
    onSelectionUpdate: () => {
      // Trigger toolbar re-render so active states update on selection change
      setToolbarTick((t) => t + 1)
    },
  }, [noteId])

  // Keep autoSave accessible to the onUpdate closure
  const autoSaveRef = useRef(autoSave)
  useEffect(() => {
    autoSaveRef.current = autoSave
  }, [autoSave])

  // Update editor content when note changes (e.g. from realtime)
  useEffect(() => {
    if (editor && note?.content && !editor.isFocused) {
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(normalizedContent)
      if (currentContent !== newContent) {
        editor.commands.setContent(normalizedContent as JSONContent)
      }
    }
  }, [editor, normalizedContent, note?.content])

  // Sync the title input when noteId changes (defaultValue doesn't update on re-render)
  useEffect(() => {
    if (titleRef.current && note?.title !== undefined) {
      titleRef.current.value = note.title
    }
  }, [noteId, note?.title])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      if (autoSaveRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          if (activeNoteIdRef.current === noteId) {
            saveNoteMutation.mutate({ title: e.target.value })
          }
        }, 500)
      } else {
        setHasUnsavedChanges(true)
      }
    },
    [saveNoteMutation, noteId]
  )

  // Manual save handler (used when autosave is off)
  const handleManualSave = useCallback(() => {
    if (!editor || activeNoteIdRef.current !== noteId) return
    const updates: { title?: string; content?: Record<string, unknown> } = {}
    updates.content = editor.getJSON() as Record<string, unknown>
    if (titleRef.current) {
      updates.title = titleRef.current.value
    }
    saveNoteMutation.mutate(updates, {
      onSuccess: () => setHasUnsavedChanges(false),
    })
  }, [editor, noteId, saveNoteMutation])

  if (noteQuery.isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-2 space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="px-6 py-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-7" />
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex-1 space-y-4 px-6 py-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    )
  }

  if (!note) return null

  const toolbarButtons = [
    { icon: <Bold className="w-4 h-4" />, label: 'Bold', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
    { icon: <Italic className="w-4 h-4" />, label: 'Italic', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
    { icon: <Strikethrough className="w-4 h-4" />, label: 'Strikethrough', action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike') },
    { icon: <Code className="w-4 h-4" />, label: 'Inline Code', action: () => editor?.chain().focus().toggleCode().run(), active: editor?.isActive('code') },
    { icon: <Highlighter className="w-4 h-4" />, label: 'Highlight', action: () => editor?.chain().focus().toggleHighlight().run(), active: editor?.isActive('highlight') },
    'separator',
    { icon: <Heading1 className="w-4 h-4" />, label: 'Heading 1', action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }) },
    { icon: <Heading2 className="w-4 h-4" />, label: 'Heading 2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
    { icon: <Heading3 className="w-4 h-4" />, label: 'Heading 3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive('heading', { level: 3 }) },
    'separator',
    { icon: <List className="w-4 h-4" />, label: 'Bullet List', action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
    { icon: <ListOrdered className="w-4 h-4" />, label: 'Numbered List', action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList') },
    { icon: <Quote className="w-4 h-4" />, label: 'Blockquote', action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive('blockquote') },
    { icon: <CodeSquare className="w-4 h-4" />, label: 'Code Block', action: () => editor?.chain().focus().toggleCodeBlock().run(), active: editor?.isActive('codeBlock') },
    { icon: <Minus className="w-4 h-4" />, label: 'Horizontal Rule', action: () => editor?.chain().focus().setHorizontalRule().run(), active: false },
    'separator',
    { icon: <Undo className="w-4 h-4" />, label: 'Undo', action: () => editor?.chain().focus().undo().run(), active: false, disabled: !editor?.can().undo() },
    { icon: <Redo className="w-4 h-4" />, label: 'Redo', action: () => editor?.chain().focus().redo().run(), active: false, disabled: !editor?.can().redo() },
  ]

  return (
    <div className="notes-editor-container flex flex-col flex-1 overflow-hidden">
      <div className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
        <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
          <Input
            ref={titleRef}
            key={noteId}
            defaultValue={note.title}
            onChange={handleTitleChange}
            className="text-2xl font-bold border-none px-0 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/40"
            placeholder="Untitled"
          />
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {formatRelativeTime(note.updated_at)}
            </span>
            {saveNoteMutation.isPending && (
              <span className="flex items-center gap-1 text-primary">
                <Save className="w-3 h-3 animate-pulse" />
                Saving...
              </span>
            )}
            {!autoSave && !saveNoteMutation.isPending && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={hasUnsavedChanges ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-6 px-2.5 text-[11px] gap-1.5 rounded-md transition-all ${
                      hasUnsavedChanges
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={handleManualSave}
                    disabled={saveNoteMutation.isPending}
                  >
                    {hasUnsavedChanges ? (
                      <>
                        <Save className="w-3 h-3" />
                        Save
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        Saved
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'All changes saved'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="note-toolbar px-4 py-2 md:px-6">
          <div className="flex items-center gap-2">
            {/* Autosave toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors shrink-0 cursor-default ${
                    autoSave ? 'bg-primary/10' : 'bg-muted/50'
                  }`}
                >
                  <Switch
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                    className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 [&_span]:h-3 [&_span]:w-3 [&_span]:data-[state=checked]:translate-x-3 [&_span]:data-[state=unchecked]:translate-x-0.5"
                  />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider select-none ${
                    autoSave ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    Auto
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{autoSave ? 'Autosave is on' : 'Autosave is off — save manually'}</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg bg-muted/50 px-2 py-1 flex-1">
              {toolbarButtons.map((btn, i) => {
                if (btn === 'separator') {
                  return <Separator key={i} orientation="vertical" className="mx-1 h-5 shrink-0" />
                }
                const b = btn as { icon: React.ReactNode; label: string; action: () => void; active: boolean | undefined; disabled?: boolean }
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 shrink-0 ${b.active ? 'bg-accent text-accent-foreground' : ''} ${b.disabled ? 'opacity-40' : ''}`}
                        onClick={b.action}
                        disabled={b.disabled}
                      >
                        {b.icon}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{b.label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            <AiToolbarButton editor={editor} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Editor */}
      <div className="tiptap-editor flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="tiptap-editor-content px-6 h-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
