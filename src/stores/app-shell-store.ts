import { create } from 'zustand'

interface AppShellState {
  compactNavExpanded: boolean
  mobileBottomNavVisible: boolean
  isMuted: boolean
  setCompactNavExpanded: (expanded: boolean) => void
  setMobileBottomNavVisible: (visible: boolean) => void
  setIsMuted: (muted: boolean) => void
  toggleMute: () => void
  toggleCompactNav: () => void
  reset: () => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  compactNavExpanded: true,
  mobileBottomNavVisible: true,
  isMuted: false,
  setCompactNavExpanded: (compactNavExpanded) => set({ compactNavExpanded }),
  setMobileBottomNavVisible: (mobileBottomNavVisible) => set({ mobileBottomNavVisible }),
  setIsMuted: (isMuted) => set({ isMuted }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCompactNav: () =>
    set((state) => ({ compactNavExpanded: !state.compactNavExpanded })),
  reset: () => set({ compactNavExpanded: true, mobileBottomNavVisible: true, isMuted: false }),
}))
