import { useCallback } from 'react'
import { useDraftsStore } from '@/stores/drafts-store'

/**
 * useChatDrafts – Lightweight hook to manage chat message drafts.
 * Uses useDraftsStore for global state and persistence.
 */
export function useChatDrafts(chatId: string | undefined) {
  const draft = useDraftsStore((state) => (chatId ? state.drafts[chatId] || '' : ''))
  const setDraft = useDraftsStore((state) => state.setDraft)
  const clearDraftStore = useDraftsStore((state) => state.clearDraft)

  const updateDraft = useCallback((text: string) => {
    if (chatId) {
      if (text.trim()) {
        setDraft(chatId, text)
      } else {
        clearDraftStore(chatId)
      }
    }
  }, [chatId, setDraft, clearDraftStore])

  const clearDraft = useCallback(() => {
    if (chatId) {
      clearDraftStore(chatId)
    }
  }, [chatId, clearDraftStore])

  return {
    draft,
    updateDraft,
    clearDraft
  }
}
