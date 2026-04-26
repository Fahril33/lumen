import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useTeams } from '@/hooks/use-teams'
import { useGlobalChatListener } from '@/hooks/use-friend-chat'
import { useGlobalPresence } from '@/hooks/use-global-presence'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { useTheme } from '@/hooks/use-theme'
import { useViewportHeight } from '@/hooks/use-viewport-height'
import { useTeamStore } from '@/stores/team-store'
import { useNotesStore } from '@/stores/notes-store'
import { useAppShellStore } from '@/stores/app-shell-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Loader, FullPageLoader } from '@/components/ui/loader'

// Lazy load large views
const AuthPage = lazy(() => import('@/routes/auth').then(m => ({ default: m.AuthPage })))
const DashboardView = lazy(() => import('@/features/dashboard/dashboard-view').then(m => ({ default: m.DashboardView })))
const ChatView = lazy(() => import('@/features/chat/chat-view').then(m => ({ default: m.ChatView })))
const NotesView = lazy(() => import('@/features/notes/notes-view').then(m => ({ default: m.NotesView })))

const LoadingView = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4">
    <Loader size="4em" />
    <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Memuat...</p>
  </div>
)

const LazyShellFallback = () => <div className="flex-1 bg-background" />

type NavItem = 'dashboard' | 'chat' | 'notes'

export function App() {
  useTheme()
  const { isMobileKeyboardOpen } = useViewportHeight()
  const queryClient = useQueryClient()
  const { user, isLoading } = useAuth()
  // Load teams into store (data flows through Zustand)
  useTeams()
  // Global chat listener for realtime unread dots and message status
  useGlobalChatListener()
  // Global presence listener for online status
  useGlobalPresence()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const { isDesktop, isMobile } = useResponsiveLayout()
  const { setCompactNavExpanded, mobileBottomNavVisible } = useAppShellStore()
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const previousUserIdRef = useRef<string | null | undefined>(undefined)

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      setCurrentTeam(teams[0])
    }
  }, [teams, currentTeam, setCurrentTeam])

  function handleNavChange(nextNav: NavItem) {
    setActiveNav(nextNav)
    if (!isDesktop) {
      setCompactNavExpanded(false)
    }
  }

  useEffect(() => {
    const nextUserId = user?.id ?? null

    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = nextUserId
      return
    }

    if (previousUserIdRef.current !== nextUserId) {
      queryClient.clear()
      useTeamStore.getState().reset()
      useNotesStore.getState().reset()
      useAppShellStore.getState().reset()
    }

    previousUserIdRef.current = nextUserId
  }, [queryClient, user?.id])

  if (isLoading) {
    return <FullPageLoader label="Lumen by ril" />
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingView />}>
        <AuthPage />
      </Suspense>
    )
  }

  return (
    <div className="h-[var(--app-height)] flex overflow-hidden bg-background">
      <Sidebar
        activeNav={activeNav}
        onNavChange={handleNavChange}
        isMobileKeyboardOpen={isMobileKeyboardOpen}
      />
      <main
        className={`flex-1 min-h-0 flex flex-col overflow-y-auto ${
          isMobile && mobileBottomNavVisible && !isMobileKeyboardOpen ? 'mb-20' : ''
        }`}
      >
        <Suspense fallback={<LazyShellFallback />}>
          {activeNav === 'dashboard' && <DashboardView />}
          {activeNav === 'chat' && <ChatView />}
          {activeNav === 'notes' && <NotesView />}
        </Suspense>
      </main>
    </div>
  )
}
