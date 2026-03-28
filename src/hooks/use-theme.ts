import { useEffect, useRef } from 'react'
import { useThemeStore, type AppTheme } from '@/stores/theme-store'

const STORAGE_KEY = 'pusdalops-theme'

function isTheme(value: string | null): value is AppTheme {
  return value === 'dark' || value === 'comfy' || value === 'light'
}

export function useTheme() {
  const { theme, setTheme } = useThemeStore()
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return

    const storedTheme = typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY)
      : null

    if (isTheme(storedTheme) && storedTheme !== theme) {
      setTheme(storedTheme)
    }

    hydratedRef.current = true
  }, [setTheme, theme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return {
    theme,
    setTheme,
  }
}
