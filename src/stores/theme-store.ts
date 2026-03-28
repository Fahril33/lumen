import { create } from 'zustand'

export type AppTheme = 'dark' | 'comfy' | 'light'

interface ThemeState {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))
