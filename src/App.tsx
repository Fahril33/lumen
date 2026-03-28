import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTeams } from '@/hooks/use-teams'
import { useGlobalChatListener } from '@/hooks/use-friend-chat'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { useTheme } from '@/hooks/use-theme'
import { useViewportHeight } from '@/hooks/use-viewport-height'
import { useTeamStore } from '@/stores/team-store'
import { useAppShellStore } from '@/stores/app-shell-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Loader2 } from 'lucide-react'

// Lazy load large views
const AuthPage = lazy(() => import('@/routes/auth').then(m => ({ default: m.AuthPage })))
const DashboardView = lazy(() => import('@/features/dashboard/dashboard-view').then(m => ({ default: m.DashboardView })))
const ChatView = lazy(() => import('@/features/chat/chat-view').then(m => ({ default: m.ChatView })))
const NotesView = lazy(() => import('@/features/notes/notes-view').then(m => ({ default: m.NotesView })))

const LoadingView = () => (
  <div className="flex-1 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading view...</p>
    </div>
  </div>
)

const LazyShellFallback = () => <div className="flex-1 bg-background" />

type NavItem = 'dashboard' | 'chat' | 'notes'

export function App() {
  useTheme()
  useViewportHeight()
  const { user, isLoading } = useAuth()
  // Load teams into store (data flows through Zustand)
  useTeams()
  // Global chat listener for realtime unread dots and message status
  useGlobalChatListener()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const { isDesktop, isMobile } = useResponsiveLayout()
  const { setCompactNavExpanded, mobileBottomNavVisible } = useAppShellStore()
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')

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

  if (isLoading) {
    return (
      <div className="h-[var(--app-height)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading Pusdalops-IT...</p>
        </div>
      </div>
    )
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
      <Sidebar activeNav={activeNav} onNavChange={handleNavChange} />
      <main
        className={`flex-1 flex flex-col overflow-hidden ${
          isMobile && mobileBottomNavVisible ? 'pb-20' : ''
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
