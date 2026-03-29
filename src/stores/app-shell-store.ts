import { create } from 'zustand'

interface AppShellState {
  compactNavExpanded: boolean
  mobileBottomNavVisible: boolean
  setCompactNavExpanded: (expanded: boolean) => void
  setMobileBottomNavVisible: (visible: boolean) => void
  toggleCompactNav: () => void
  reset: () => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  compactNavExpanded: true,
  mobileBottomNavVisible: true,
  setCompactNavExpanded: (compactNavExpanded) => set({ compactNavExpanded }),
  setMobileBottomNavVisible: (mobileBottomNavVisible) => set({ mobileBottomNavVisible }),
  toggleCompactNav: () =>
    set((state) => ({ compactNavExpanded: !state.compactNavExpanded })),
  reset: () => set({ compactNavExpanded: true, mobileBottomNavVisible: true }),
}))
