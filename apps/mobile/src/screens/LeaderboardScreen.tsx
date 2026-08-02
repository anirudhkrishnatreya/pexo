import { useQuery } from "@tanstack/react-query"
import React, { useState } from "react"
import { FlatList, Pressable, Text, View } from "react-native"
import { api } from "../api/client"
import { Avatar, Body, Card, Header, Screen } from "../components/ui"
import { useTheme } from "../theme"

type Board = "xp" | "territories" | "weekly-distance"

type XpRow = { rank: number; displayName: string; username: string; level: number; xp: number }
type TerritoryRow = { rank: number; territories: number; user: { displayName: string } }
type DistanceRow = { rank: number; distanceM: number; user?: { displayName: string } }

const LABELS: Record<Board, string> = {
  xp: "Global XP",
  territories: "Kingdoms",
  "weekly-distance": "Weekly KM",
}

export function LeaderboardScreen() {
  const t = useTheme()
  const [board, setBoard] = useState<Board>("xp")

  const rows = useQuery({
    queryKey: ["leaderboard", board],
    queryFn: () => api<Array<XpRow | TerritoryRow | DistanceRow>>(`/leaderboards/${board}`),
  })

  return (
    <Screen>
      <Header title="Leaderboard" subtitle="GLOBAL ATHLETE RANKINGS" />

      {/* Segment Selector Pills */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.pill,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: t.colors.border,
        }}
      >
        {(Object.keys(LABELS) as Board[]).map((b) => {
          const active = board === b
          return (
            <Pressable
              key={b}
              onPress={() => setBoard(b)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: t.radius.pill,
                backgroundColor: active ? t.colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : t.colors.textMuted,
                  fontWeight: "900",
                  fontSize: 12,
                  letterSpacing: 0.3,
                }}
              >
                {LABELS[b]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <FlatList
        data={rows.data ?? []}
        keyExtractor={(_, i) => String(i)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Body muted>{rows.isLoading ? "Loading rankings…" : "No ranking data recorded."}</Body>
          </View>
        }
        renderItem={({ item }) => {
          const name =
            "displayName" in item ? item.displayName : (item.user?.displayName ?? "Unknown")
          const value =
            "xp" in item
              ? `${item.xp.toLocaleString()} XP`
              : "territories" in item
                ? `${item.territories} 🏰`
                : `${((item as DistanceRow).distanceM / 1000).toFixed(1)} km`

          const isPodium = item.rank <= 3
          const medal = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`

          return (
            <Card
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                borderColor: isPodium ? t.colors.primary : t.colors.cardBorder,
              }}
            >
              <Text
                style={{
                  color: isPodium ? t.colors.primary : t.colors.textMuted,
                  width: 40,
                  fontSize: 16,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {medal}
              </Text>
              <Avatar name={name} size={36} />
              <Text style={{ color: t.colors.text, fontWeight: "800", flex: 1, marginLeft: 12, fontSize: 15 }}>
                {name}
              </Text>
              <Text style={{ color: t.colors.primary, fontWeight: "900", fontSize: 14 }}>{value}</Text>
            </Card>
          )
        }}
      />
    </Screen>
  )
}
