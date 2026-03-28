import { create } from 'zustand'
import type { Team, Channel } from '@/types/database'

interface TeamState {
  currentTeam: Team | null
  currentChannel: Channel | null
  teams: Team[]
  setCurrentTeam: (team: Team | null) => void
  setCurrentChannel: (channel: Channel | null) => void
  setTeams: (teams: Team[]) => void
  addTeam: (team: Team) => void
  reset: () => void
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  currentChannel: null,
  teams: [],
  setCurrentTeam: (currentTeam) => set({ currentTeam, currentChannel: null }),
  setCurrentChannel: (currentChannel) => set({ currentChannel }),
  setTeams: (teams) => set({ teams }),
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
  reset: () => set({ currentTeam: null, currentChannel: null, teams: [] }),
}))
