import { useEffect } from 'react'

function setViewportVars() {
  if (typeof window === 'undefined') return

  const viewport = window.visualViewport
  const height = viewport?.height ?? window.innerHeight
  const width = viewport?.width ?? window.innerWidth

  document.documentElement.style.setProperty('--app-height', `${height}px`)
  document.documentElement.style.setProperty('--app-width', `${width}px`)
}

export function useViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(setViewportVars)
    }

    update()

    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])
}
