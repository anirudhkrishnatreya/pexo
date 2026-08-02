import { create } from "zustand"
import { api, clearTokens, getAccessToken, saveTokens } from "../api/client"

export type Profile = {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string | null
  xp: number
  level: number
  caloriesGoal: number
  proteinGoalG: number
  waterGoalMl: number
  _count?: { followers: number; following: number; activities: number; territories: number }
}

type AuthState = {
  user: Profile | null
  booted: boolean
  boot: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (input: {
    email: string
    username: string
    displayName: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  booted: false,

  boot: async () => {
    try {
      const token = await getAccessToken()
      if (token) {
        const user = await api<Profile>("/users/me")
        set({ user, booted: true })
        return
      }
    } catch {
      await clearTokens()
    }
    set({ booted: true })
  },

  login: async (email, password) => {
    const res = await api<{ user: Profile; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { method: "POST", body: { email, password } },
    )
    await saveTokens(res.accessToken, res.refreshToken)
    set({ user: res.user })
  },

  signup: async (input) => {
    const res = await api<{ user: Profile; accessToken: string; refreshToken: string }>(
      "/auth/signup",
      { method: "POST", body: input },
    )
    await saveTokens(res.accessToken, res.refreshToken)
    set({ user: res.user })
  },

  logout: async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined)
    await clearTokens()
    set({ user: null })
  },

  refreshProfile: async () => {
    const user = await api<Profile>("/users/me")
    set({ user })
  },
}))
