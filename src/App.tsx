import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTeams } from '@/hooks/use-teams'
import { useGlobalChatListener } from '@/hooks/use-friend-chat'
import { useTeamStore } from '@/stores/team-store'
import { AuthPage } from '@/routes/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardView } from '@/features/dashboard/dashboard-view'
import { ChatView } from '@/features/chat/chat-view'
import { NotesView } from '@/features/notes/notes-view'
import { Loader2 } from 'lucide-react'

type NavItem = 'dashboard' | 'chat' | 'notes'

export function App() {
  const { user, isLoading } = useAuth()
  // Load teams into store (data flows through Zustand)
  useTeams()
  // Global chat listener for realtime unread dots and message status
  useGlobalChatListener()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      setCurrentTeam(teams[0])
    }
  }, [teams, currentTeam, setCurrentTeam])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
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
    return <AuthPage />
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeNav === 'dashboard' && <DashboardView />}
        {activeNav === 'chat' && <ChatView />}
        {activeNav === 'notes' && <NotesView />}
      </main>
    </div>
  )
}
