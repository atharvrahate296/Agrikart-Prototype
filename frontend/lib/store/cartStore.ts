import { create } from 'zustand'

interface AppState {
  // Active role context
  activeRole: 'farmer' | 'buyer' | 'fpo_agent' | 'admin' | null
  setActiveRole: (role: AppState['activeRole']) => void

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Dashboard refresh trigger
  refreshKey: number
  triggerRefresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeRole: null,
  setActiveRole: (role) => set({ activeRole: role }),

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}))
