import { create } from 'zustand'

interface PresenceState {
  onlineUsers: Set<string>
  setOnlineUsers: (userIds: Set<string>) => void
  addOnlineUser: (userId: string) => void
  removeOnlineUser: (userId: string) => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: new Set(),
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  addOnlineUser: (userId) => set((state) => {
    const next = new Set(state.onlineUsers)
    next.add(userId)
    return { onlineUsers: next }
  }),
  removeOnlineUser: (userId) => set((state) => {
    const next = new Set(state.onlineUsers)
    next.delete(userId)
    return { onlineUsers: next }
  }),
}))
