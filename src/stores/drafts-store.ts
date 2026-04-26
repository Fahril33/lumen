import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DraftsState {
  drafts: Record<string, string> // chatId -> text
  setDraft: (chatId: string, text: string) => void
  getDraft: (chatId: string) => string
  clearDraft: (chatId: string) => void
}

/**
 * useDraftsStore – Global store for chat message drafts with persistence.
 * This allows the sidebar and main chat view to stay in sync.
 */
export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: {},
      setDraft: (chatId, text) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [chatId]: text,
          },
        }))
      },
      getDraft: (chatId) => {
        return get().drafts[chatId] || ''
      },
      clearDraft: (chatId) => {
        set((state) => {
          const newDrafts = { ...state.drafts }
          delete newDrafts[chatId]
          return { drafts: newDrafts }
        })
      },
    }),
    {
      name: 'lumen-chat-drafts',
    }
  )
)
