import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useResponsiveLayout } from '@/hooks/use-responsive-layout'
import { useTheme } from '@/hooks/use-theme'
import { useTeamStore } from '@/stores/team-store'
import { useTeams } from '@/hooks/use-teams'
import { useChats } from '@/hooks/use-friend-chat'
import { useAppShellStore } from '@/stores/app-shell-store'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettingsDialog } from '@/features/profile/profile-settings-dialog'
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
  Check,
  PanelLeft,
  PanelLeftClose,
  MonitorCog,
} from 'lucide-react'

type NavItem = 'dashboard' | 'chat' | 'notes'

interface SidebarProps {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
}

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { isDesktop, isMobile, isNarrowMobile } = useResponsiveLayout()
  const { compactNavExpanded, toggleCompactNav, mobileBottomNavVisible } = useAppShellStore()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const { teamsQuery, createTeamMutation, joinTeamMutation } = useTeams()
  const { chatsQuery } = useChats()
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [showTeamsListDialog, setShowTeamsListDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showMobileNavDialog, setShowMobileNavDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const chats = chatsQuery.data ?? []
  const isProfileLoading = !profile
  const isTeamsLoading = teamsQuery.isLoading
  const showLabels = isDesktop || compactNavExpanded
  const sidebarWidthClassName = isDesktop
    ? 'w-64'
    : compactNavExpanded
      ? 'w-full sm:w-[22rem]'
      : 'w-20'
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
    { key: 'notes', label: 'Notes (soon)', icon: <FileText className="w-5 h-5" /> },
  ]
  const activeNavItem = navItems.find((item) => item.key === activeNav) ?? navItems[0]
  const activeNavIndex = navItems.findIndex((item) => item.key === activeNav)
  const themeOptions: Array<{ key: 'dark' | 'comfy' | 'light' | 'soon'; label: string; description: string; disabled?: boolean }> = [
    { key: 'dark', label: 'Dark', description: 'Default dark workspace' },
    { key: 'comfy', label: 'Comfy', description: 'Atom-inspired dark comfort' },
    { key: 'light', label: 'Light', description: 'Bright neutral canvas' },
    { key: 'soon', label: 'Soon', description: 'More themes later', disabled: true },
  ]

  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 ease-out ${
            mobileBottomNavVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-14 w-14 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 px-0"
              onClick={() => setShowTeamsListDialog(true)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Hash className="h-4 w-4" />
              </div>
            </Button>

            {isNarrowMobile ? (
              <Button
                type="button"
                variant="ghost"
                className="h-14 justify-between rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 px-4"
                onClick={() => setShowMobileNavDialog(true)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="text-sidebar-primary">{activeNavItem.icon}</div>
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">
                    {activeNavItem.label}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : (
              <div className="relative grid grid-cols-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 p-1">
                <div
                  className="absolute inset-y-1 left-1 rounded-xl bg-sidebar-primary/15 shadow-sm transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.5rem) / 3)',
                    transform: `translateX(${Math.max(activeNavIndex, 0) * 100}%)`,
                  }}
                />
                {navItems.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant="ghost"
                    className={`relative z-10 w-full rounded-xl ${
                      activeNav === item.key
                        ? 'text-sidebar-primary'
                        : 'text-muted-foreground'
                    } ${
                      activeNav === item.key
                        ? 'h-14 justify-center px-2'
                        : 'h-12 justify-center px-0'
                    } transition-all duration-300 ease-out`}
                    onClick={() => onNavChange(item.key)}
                  >
                    <div
                      className={`flex transition-all duration-300 ease-out ${
                        activeNav === item.key
                          ? 'flex-col items-center gap-1'
                          : 'items-center justify-center'
                      }`}
                    >
                      {item.icon}
                      {activeNav === item.key ? (
                        <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                      ) : null}
                    </div>
                    {item.badge ? (
                      <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-14 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 px-3"
                onClick={() => setShowAccountDialog(true)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showMobileNavDialog} onOpenChange={setShowMobileNavDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Navigate</DialogTitle>
              <DialogDescription>Choose the content section to open.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant={activeNav === item.key ? 'secondary' : 'ghost'}
                  className="relative h-12 justify-start gap-3"
                  onClick={() => {
                    onNavChange(item.key)
                    setShowMobileNavDialog(false)
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTeamsListDialog} onOpenChange={setShowTeamsListDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Teams</DialogTitle>
              <DialogDescription>Switch workspace or create a new team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {teams.length > 0 ? (
                teams.map((team) => (
                  <Button
                    key={team.id}
                    type="button"
                    variant={currentTeam?.id === team.id ? 'secondary' : 'ghost'}
                    className="h-12 w-full justify-start gap-3"
                    onClick={() => {
                      setCurrentTeam(team)
                      setShowTeamsListDialog(false)
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                      {getInitials(team.name)}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.invite_code}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No teams yet. Create or join one to get started.
                </div>
              )}
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setShowTeamsListDialog(false)
                setShowTeamDialog(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Create or Join Team
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
              <DialogDescription>Manage your profile and session.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.full_name ?? 'User'}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowAccountDialog(false)
                  setShowProfileDialog(true)
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <MonitorCog className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Theme</p>
                </div>
                <div className="grid gap-2">
                  {themeOptions.map((option) => (
                    <Button
                      key={option.key}
                      type="button"
                      variant={option.key === theme ? 'secondary' : 'ghost'}
                      className="w-full justify-between"
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled || option.key === 'soon') return
                        setTheme(option.key)
                      }}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      {option.key === theme ? <Check className="h-4 w-4" /> : null}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        <ProfileSettingsDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
        />
      </>
    )
  }

  return (
    <>
      <div className={`flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ${sidebarWidthClassName}`}>
        {/* Team selector */}
        <div className="p-3">
          {!isDesktop ? (
            <div className={`mb-3 flex items-center ${showLabels ? 'justify-between' : 'justify-center'}`}>
              {showLabels ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Workspace
                  </p>
                  <p className="text-sm text-sidebar-foreground/80">Adaptive navigation</p>
                </div>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={toggleCompactNav}
              >
                {compactNavExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`h-11 w-full px-3 text-left hover:bg-sidebar-accent ${showLabels ? 'justify-between' : 'justify-center'}`}
              >
                {isTeamsLoading ? (
                  <div className={`flex w-full items-center ${showLabels ? 'gap-2' : 'justify-center'}`}>
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    {showLabels ? <Skeleton className="h-4 flex-1" /> : null}
                  </div>
                ) : (
                  <>
                    <div className={`flex min-w-0 items-center ${showLabels ? 'gap-2' : ''}`}>
                      <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {currentTeam ? getInitials(currentTeam.name) : '?'}
                      </div>
                      {showLabels ? (
                        <span className="truncate font-semibold text-sm">
                          {currentTeam?.name ?? 'Select Team'}
                        </span>
                      ) : null}
                    </div>
                    {showLabels ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : null}
                  </>
                )}
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
                    className={`relative w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                      showLabels ? 'flex items-center gap-3' : 'flex items-center justify-center'
                    } ${
                      activeNav === item.key
                        ? 'bg-sidebar-primary/15 text-sidebar-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    {item.icon}
                    {showLabels ? item.label : null}
                    {showLabels && item.badge ? (
                      <div className="ml-auto flex items-center justify-center gap-1 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                        <Bell className="w-3 h-3 fill-current animate-pulse" />
                        <span>{item.badge > 99 ? '99+' : item.badge}</span>
                      </div>
                    ) : activeNav === item.key ? (
                      <div className={`${showLabels ? 'ml-auto' : 'absolute right-2 top-1/2 -translate-y-1/2'} h-1.5 w-1.5 rounded-full bg-sidebar-primary`} />
                    ) : null}
                  </button>
                </TooltipTrigger>
                {!showLabels ? <TooltipContent side="right">{item.label}</TooltipContent> : null}
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* User profile */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`h-12 w-full px-3 hover:bg-sidebar-accent ${showLabels ? 'justify-start' : 'justify-center'}`}
              >
                {isProfileLoading ? (
                  <div className={`flex w-full items-center ${showLabels ? 'gap-3' : 'justify-center'}`}>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    {showLabels ? (
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <Avatar className={`h-8 w-8 ${showLabels ? 'mr-3' : ''}`}>
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
                    </Avatar>
                    {showLabels ? (
                      <div className="flex min-w-0 flex-col items-start">
                        <span className="text-sm font-medium truncate">{profile?.full_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2">
              <MonitorCog className="w-4 h-4" />
              Theme
            </DropdownMenuLabel>
            {themeOptions.map((option) => (
              <DropdownMenuItem
                key={option.key}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled || option.key === 'soon') return
                  setTheme(option.key)
                }}
              >
                <span className="flex-1">{option.label}</span>
                {option.key === theme ? <Check className="w-4 h-4" /> : null}
              </DropdownMenuItem>
            ))}
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

      <ProfileSettingsDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
      />
    </>
  )
}
