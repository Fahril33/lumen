import type { JSONContent } from '@tiptap/react'

export function createEmptyTiptapDocument(): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  }
}

export function normalizeTiptapContent(value: unknown): JSONContent {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const maybeContent = value as JSONContent

    if (maybeContent.type === 'doc') {
      return {
        ...maybeContent,
        content: Array.isArray(maybeContent.content) && maybeContent.content.length > 0
          ? maybeContent.content
          : createEmptyTiptapDocument().content,
      }
    }
  }

  return createEmptyTiptapDocument()
}
