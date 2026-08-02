import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native"
import React, { createContext, useContext, useMemo } from "react"

export type PexoTheme = {
  dark: boolean
  colors: {
    background: string
    surface: string
    surfaceGlass: string
    cardBorder: string
    text: string
    textMuted: string
    textSubtle: string
    primary: string
    primaryText: string
    accent: string
    danger: string
    success: string
    border: string
    territoryOwn: string
    territoryEnemy: string
    badgeBg: string
  }
  radius: { sm: number; md: number; lg: number; xl: number; pill: number }
  spacing: (n: number) => number
}

const palette = {
  stravaOrange: "#FC5200",
  stravaOrangeHover: "#E04800",
  emeraldAccent: "#00E5A0",
  cyanGlow: "#00F0FF",
}

export function buildTheme(dark: boolean): PexoTheme {
  return {
    dark,
    colors: dark
      ? {
          background: "#090C10",
          surface: "#131822",
          surfaceGlass: "rgba(19, 24, 34, 0.85)",
          cardBorder: "#1E2638",
          text: "#FFFFFF",
          textMuted: "#94A3B8",
          textSubtle: "#64748B",
          primary: palette.stravaOrange,
          primaryText: "#FFFFFF",
          accent: palette.emeraldAccent,
          danger: "#FF4D4D",
          success: "#10B981",
          border: "#1E2638",
          territoryOwn: "rgba(0, 229, 160, 0.28)",
          territoryEnemy: "rgba(255, 77, 77, 0.25)",
          badgeBg: "rgba(252, 82, 0, 0.15)",
        }
      : {
          background: "#F4F5F8",
          surface: "#FFFFFF",
          surfaceGlass: "rgba(255, 255, 255, 0.9)",
          cardBorder: "#E2E8F0",
          text: "#0F172A",
          textMuted: "#64748B",
          textSubtle: "#94A3B8",
          primary: palette.stravaOrange,
          primaryText: "#FFFFFF",
          accent: "#059669",
          danger: "#DC2626",
          success: "#10B981",
          border: "#E2E8F0",
          territoryOwn: "rgba(16, 185, 129, 0.20)",
          territoryEnemy: "rgba(220, 38, 38, 0.18)",
          badgeBg: "rgba(252, 82, 0, 0.10)",
        },
    radius: { sm: 6, md: 12, lg: 16, xl: 24, pill: 999 },
    spacing: (n) => n * 4,
  }
}

const ThemeContext = createContext<PexoTheme>(buildTheme(true))

export function ThemeProvider({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  const theme = useMemo(() => buildTheme(dark), [dark])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

export function navTheme(dark: boolean): Theme {
  const t = buildTheme(dark)
  const base = dark ? DarkTheme : DefaultTheme
  return {
    ...base,
    colors: {
      ...base.colors,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.text,
      primary: t.colors.primary,
      border: t.colors.border,
    },
  }
}
