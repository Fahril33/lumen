import { useEffect, useState } from 'react'

function getMatches(query: string) {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

export function useResponsiveLayout() {
  const [viewport, setViewport] = useState(() => ({
    isMobile: getMatches('(max-width: 767px)'),
    isNarrowMobile: getMatches('(max-width: 375px)'),
    isTablet: getMatches('(min-width: 768px) and (max-width: 1279px)'),
    isDesktop: getMatches('(min-width: 1280px)'),
  }))

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const narrowMobileQuery = window.matchMedia('(max-width: 375px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1279px)')
    const desktopQuery = window.matchMedia('(min-width: 1280px)')
    const update = () => {
      setViewport({
        isMobile: mobileQuery.matches,
        isNarrowMobile: narrowMobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches,
      })
    }

    update()
    mobileQuery.addEventListener('change', update)
    narrowMobileQuery.addEventListener('change', update)
    tabletQuery.addEventListener('change', update)
    desktopQuery.addEventListener('change', update)

    return () => {
      mobileQuery.removeEventListener('change', update)
      narrowMobileQuery.removeEventListener('change', update)
      tabletQuery.removeEventListener('change', update)
      desktopQuery.removeEventListener('change', update)
    }
  }, [])

  return {
    ...viewport,
    isCompact: !viewport.isDesktop,
  }
}
