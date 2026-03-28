import { create } from 'zustand'

interface NotesState {
  activeNoteId: string | null
  searchQuery: string
  setActiveNoteId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  reset: () => void
}

export const useNotesStore = create<NotesState>((set) => ({
  activeNoteId: null,
  searchQuery: '',
  setActiveNoteId: (activeNoteId) => set({ activeNoteId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set({ activeNoteId: null, searchQuery: '' }),
}))
