import { useEffect, useState } from 'react'

interface ViewportState {
  appHeight: number
  appWidth: number
  keyboardInset: number
  isMobileKeyboardOpen: boolean
}

function isEditableElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) return false
  if (element.isContentEditable) return true
  if (element.getAttribute('role') === 'textbox') return true

  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled
  }

  if (element instanceof HTMLInputElement) {
    const keyboardInputTypes = new Set([
      'text',
      'search',
      'email',
      'password',
      'tel',
      'url',
      'number',
      'date',
      'datetime-local',
      'month',
      'time',
      'week',
    ])

    return keyboardInputTypes.has(element.type) && !element.readOnly && !element.disabled
  }

  return false
}

function getViewportState(): ViewportState {
  if (typeof window === 'undefined') {
    return {
      appHeight: 0,
      appWidth: 0,
      keyboardInset: 0,
      isMobileKeyboardOpen: false,
    }
  }

  const viewport = window.visualViewport
  const appHeight = Math.round(viewport?.height ?? window.innerHeight)
  const appWidth = Math.round(viewport?.width ?? window.innerWidth)
  const layoutHeight = window.innerHeight
  const viewportOffsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0))
  const rawKeyboardInset = Math.max(0, Math.round(layoutHeight - appHeight - viewportOffsetTop))
  const keyboardThreshold = Math.max(120, Math.round(layoutHeight * 0.18))
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  const hasEditableFocus = isEditableElement(document.activeElement)
  const isMobileKeyboardOpen = isMobile && hasEditableFocus && rawKeyboardInset > keyboardThreshold
  const keyboardInset = isMobileKeyboardOpen ? rawKeyboardInset : 0

  return {
    appHeight,
    appWidth,
    keyboardInset,
    isMobileKeyboardOpen,
  }
}

function syncViewportVars({ appHeight, appWidth, keyboardInset, isMobileKeyboardOpen }: ViewportState) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--app-height', `${appHeight}px`)
  root.style.setProperty('--app-width', `${appWidth}px`)
  root.style.setProperty('--mobile-keyboard-inset', `${keyboardInset}px`)
  root.dataset.mobileKeyboardOpen = isMobileKeyboardOpen ? 'true' : 'false'
}

export function useViewportHeight() {
  const [viewportState, setViewportState] = useState<ViewportState>(() => getViewportState())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const nextState = getViewportState()
        syncViewportVars(nextState)
        setViewportState(nextState)
      })
    }

    update()

    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    document.addEventListener('focusin', update, true)
    document.addEventListener('focusout', update, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update, true)
      document.removeEventListener('focusout', update, true)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousRootOverscroll = root.style.overscrollBehavior
    const previousBodyOverscroll = body.style.overscrollBehavior

    if (viewportState.isMobileKeyboardOpen) {
      root.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      root.style.overscrollBehavior = 'none'
      body.style.overscrollBehavior = 'none'
    } else {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      body.style.overscrollBehavior = previousBodyOverscroll
    }

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [viewportState.isMobileKeyboardOpen])

  return viewportState
}
