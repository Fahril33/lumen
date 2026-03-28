import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTeamStore } from '@/stores/team-store'
import { useTeams } from '@/hooks/use-teams'
import { useChats } from '@/hooks/use-friend-chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/utils'
import {
  MessageSquare,
  FileText,
  LayoutDashboard,
  Plus,
  LogOut,
  Settings,
  Users,
  ChevronDown,
  Loader2,
  Hash,
  Bell,
} from 'lucide-react'

type NavItem = 'dashboard' | 'chat' | 'notes'

interface SidebarProps {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
}

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const { createTeamMutation, joinTeamMutation } = useTeams()
  const { chatsQuery } = useChats()
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const chats = chatsQuery.data ?? []
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const unreadCount = chats.filter((chat: any) => {
    const lastMsg = chat.messages?.[0]
    if (!lastMsg) return false
    // Only count if the last message is from someone else and is not 'read'
    return lastMsg.user_id !== profile?.id && lastMsg.status !== 'read'
  }).length

  const navItems: { key: NavItem; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, badge: unreadCount },
    { key: 'notes', label: 'Notes', icon: <FileText className="w-5 h-5" /> },
  ]

  return (
    <>
      <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
        {/* Team selector */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-3 h-11 text-left hover:bg-sidebar-accent">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {currentTeam ? getInitials(currentTeam.name) : '?'}
                  </div>
                  <span className="truncate font-semibold text-sm">
                    {currentTeam?.name ?? 'Select Team'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Your Teams</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setCurrentTeam(team)}
                  className={currentTeam?.id === team.id ? 'bg-accent' : ''}
                >
                  <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                  {team.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTeamDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create or Join Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavChange(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                      activeNav === item.key
                        ? 'bg-sidebar-primary/15 text-sidebar-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge ? (
                      <div className="ml-auto flex items-center justify-center gap-1 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                        <Bell className="w-3 h-3 fill-current animate-pulse" />
                        <span>{item.badge > 99 ? '99+' : item.badge}</span>
                      </div>
                    ) : activeNav === item.key ? (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* User profile */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-3 h-12 hover:bg-sidebar-accent">
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium truncate">{profile?.full_name}</span>
                  <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Create / Join Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create or Join Team</DialogTitle>
            <DialogDescription>Create a new team or join an existing one with an invite code.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="join">Join</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input placeholder="My Awesome Team" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="What's this team about?" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={!newTeamName || createTeamMutation.isPending}
                onClick={() => {
                  createTeamMutation.mutate(
                    { name: newTeamName, description: newTeamDesc },
                    { onSuccess: () => { setShowTeamDialog(false); setNewTeamName(''); setNewTeamDesc('') } }
                  )
                }}
              >
                {createTeamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4" /> Create Team</>}
              </Button>
            </TabsContent>
            <TabsContent value="join" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input placeholder="Paste invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={!inviteCode || joinTeamMutation.isPending}
                onClick={() => {
                  joinTeamMutation.mutate(inviteCode, {
                    onSuccess: () => { setShowTeamDialog(false); setInviteCode('') },
                  })
                }}
              >
                {joinTeamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Team'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
