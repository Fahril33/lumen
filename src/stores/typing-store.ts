import { create } from 'zustand'

interface TypingState {
  // Mapping of chatId -> list of users typing
  typingMap: Record<string, { user_id: string; full_name: string }[]>
  setTypingUsers: (chatId: string, users: { user_id: string; full_name: string }[]) => void
}

export const useTypingStore = create<TypingState>((set) => ({
  typingMap: {},
  setTypingUsers: (chatId, users) => 
    set((state) => ({
      typingMap: { ...state.typingMap, [chatId]: users }
    })),
}))
