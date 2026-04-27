import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface MediaState {
  /** Map of messageId -> boolean indicating if media is "downloaded" (ready to view) */
  readyMedia: Record<string, boolean>
  setMediaReady: (messageId: string) => void
  isMediaReady: (messageId: string) => boolean
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      readyMedia: {},
      setMediaReady: (messageId: string) => 
        set((state) => ({
          readyMedia: { ...state.readyMedia, [messageId]: true }
        })),
      isMediaReady: (messageId: string) => !!get().readyMedia[messageId],
    }),
    {
      name: 'lumen-media-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
