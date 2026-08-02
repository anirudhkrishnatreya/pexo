import { useQuery } from "@tanstack/react-query"
import React from "react"
import { ScrollView, Text, View } from "react-native"
import { api } from "../api/client"
import { Avatar, Badge, Button, Card, Header, ProgressBar, Screen, Stat } from "../components/ui"
import { formatDistance, formatDuration } from "../lib/format"
import { useAuth } from "../store/auth"
import { useTheme } from "../theme"

type Weekly = { count: number; distanceM: number; movingSec: number; calories: number; elevGainM: number }
type Territory = { id: string; name: string; areaSqM: number; rarity: string }

export function ProfileScreen() {
  const t = useTheme()
  const { user, logout } = useAuth()

  const weekly = useQuery({
    queryKey: ["weekly-stats"],
    queryFn: () => api<Weekly>("/activities/stats/weekly"),
  })
  const kingdom = useQuery({
    queryKey: ["my-territories"],
    queryFn: () => api<Territory[]>("/territories/mine"),
  })

  if (!user) return null
  const w = weekly.data
  const currentXpInLevel = user.xp % 1000
  const xpProgress = currentXpInLevel / 1000

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Athlete Header Card */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar name={user.displayName} level={user.level} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.3 }}>
                {user.displayName}
              </Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 13, marginTop: 1 }}>
                @{user.username} · Athlete
              </Text>
            </View>
          </View>

          {user.bio ? (
            <Text style={{ color: t.colors.textMuted, fontSize: 13, marginTop: 12, lineHeight: 18 }}>
              {user.bio}
            </Text>
          ) : null}

          {/* XP Progress Bar */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: t.colors.primary, fontWeight: "800", fontSize: 12 }}>
                LEVEL {user.level} ATHLETE
              </Text>
              <Text style={{ color: t.colors.textMuted, fontWeight: "700", fontSize: 12 }}>
                {user.xp.toLocaleString()} XP TOTAL
              </Text>
            </View>
            <ProgressBar progress={xpProgress} />
          </View>

          {/* Lifetime Stats */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: t.colors.background,
              borderRadius: t.radius.md,
              paddingVertical: 12,
              marginTop: 16,
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <Stat label="Activities" value={String(user._count?.activities ?? 0)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="Followers" value={String(user._count?.followers ?? 0)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="Kingdoms" value={String(user._count?.territories ?? 0)} />
          </View>
        </Card>

        {/* Weekly Summary */}
        <Header title="Weekly Overview" subtitle="LAST 7 DAYS" />
        <Card style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row" }}>
            <Stat label="Workouts" value={String(w?.count ?? 0)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="Distance" value={formatDistance(w?.distanceM ?? 0)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="Time" value={formatDuration(w?.movingSec ?? 0)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="Calories" value={String(w?.calories ?? 0)} />
          </View>
        </Card>

        {/* My Kingdom Section */}
        <Header title="My Kingdom" subtitle="CONQUERED TERRITORIES" />
        {(kingdom.data ?? []).length === 0 && (
          <Card style={{ marginBottom: 20, alignItems: "center", paddingVertical: 24 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🏰</Text>
            <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 16 }}>No Territories Yet</Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 4 }}>
              Record a GPS loop around a park or neighborhood to claim it!
            </Text>
          </Card>
        )}

        {(kingdom.data ?? []).map((territory) => (
          <Card key={territory.id} style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 15 }}>
                {territory.name}
              </Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {(territory.areaSqM / 10000).toFixed(1)} hectares
              </Text>
            </View>
            <Badge
              label={territory.rarity}
              variant={territory.rarity === "LEGENDARY" ? "accent" : territory.rarity === "RARE" ? "primary" : "muted"}
            />
          </Card>
        ))}

        {/* Sign Out Button */}
        <View style={{ marginTop: 24 }}>
          <Button title="Log Out" variant="ghost" onPress={() => void logout()} />
        </View>
      </ScrollView>
    </Screen>
  )
}
