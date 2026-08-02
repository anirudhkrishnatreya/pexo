import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as Haptics from "expo-haptics"
import React from "react"
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native"
import { api } from "../api/client"
import { Avatar, Badge, Body, Card, Header, Screen, Stat } from "../components/ui"
import { formatDistance, formatDuration, formatPace, timeAgo } from "../lib/format"
import { RootStackParamList } from "../navigation"
import { useTheme } from "../theme"

type FeedItem = {
  id: string
  type: string
  title: string
  startedAt: string
  distanceM: number
  movingSec: number
  user: { username: string; displayName: string; level: number }
  capture: { territoryId: string; xpAwarded: number } | null
  _count: { kudos: number; comments: number }
}

type FeedPage = { items: FeedItem[]; meta: { page: number; totalPages: number } }

const SPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  RUN: "fitness-outline",
  WALK: "walk-outline",
  RIDE: "bicycle-outline",
  SWIM: "water-outline",
  HIKE: "compass-outline",
}

export function FeedScreen() {
  const t = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const queryClient = useQueryClient()

  const feed = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => api<FeedPage>(`/social/feed?page=${pageParam}&limit=20`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  })

  const kudos = useMutation({
    mutationFn: (activityId: string) =>
      api(`/social/activities/${activityId}/kudos`, { method: "POST" }),
    onMutate: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  })

  const items = feed.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <Screen>
      <Header
        title="Activity Feed"
        subtitle="COMMUNITY CONQUESTS"
        right={
          <Pressable
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: t.colors.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={t.colors.text} />
          </Pressable>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        onEndReached={() => feed.hasNextPage && feed.fetchNextPage()}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => feed.refetch()}
            tintColor={t.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <Ionicons name="sparkles-outline" size={32} color={t.colors.textMuted} />
            <Text style={{ color: t.colors.textMuted, marginTop: 12, fontSize: 14, fontWeight: "600" }}>
              {feed.isLoading ? "Loading activity feed…" : "No activities recorded yet. Go record one!"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const paceSecPerKm = item.distanceM > 0 ? item.movingSec / (item.distanceM / 1000) : 0
          const iconName = SPORT_ICONS[item.type] ?? "fitness-outline"

          return (
            <Pressable onPress={() => nav.navigate("ActivityDetail", { activityId: item.id })}>
              <Card style={{ padding: 18 }}>
                {/* User Info Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar name={item.user.displayName} level={item.user.level} size={42} />
                    <View>
                      <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 15 }}>
                        {item.user.displayName}
                      </Text>
                      <Text style={{ color: t.colors.textMuted, fontSize: 12, marginTop: 1 }}>
                        {timeAgo(item.startedAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={iconName} size={16} color={t.colors.primary} />
                    <Badge label={item.type} variant="primary" />
                  </View>
                </View>

                {/* Activity Title */}
                <Text style={{ color: t.colors.text, fontSize: 19, fontWeight: "900", letterSpacing: -0.3, marginBottom: 14 }}>
                  {item.title}
                </Text>

                {/* 3-Column Metric Box */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: t.colors.background,
                    borderRadius: t.radius.md,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                  }}
                >
                  <Stat label="DISTANCE" value={formatDistance(item.distanceM)} />
                  <View style={{ width: 1, backgroundColor: t.colors.border }} />
                  <Stat label="AVG PACE" value={formatPace(paceSecPerKm)} />
                  <View style={{ width: 1, backgroundColor: t.colors.border }} />
                  <Stat label="TIME" value={formatDuration(item.movingSec)} />
                </View>

                {/* Territory Capture Banner */}
                {item.capture && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(0, 229, 160, 0.12)",
                      borderRadius: t.radius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: "rgba(0, 229, 160, 0.3)",
                      gap: 10,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={18} color={t.colors.accent} />
                    <Text style={{ color: t.colors.accent, fontWeight: "900", fontSize: 12, letterSpacing: 0.5, flex: 1, textTransform: "uppercase" }}>
                      TERRITORY CONQUERED · +{item.capture.xpAwarded} XP
                    </Text>
                  </View>
                )}

                {/* Kudos & Discussion Footer */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Pressable
                      onPress={() => kudos.mutate(item.id)}
                      hitSlop={10}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(252, 82, 0, 0.12)",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: t.radius.pill,
                        gap: 6,
                      }}
                    >
                      <Ionicons name="heart" size={16} color={t.colors.primary} />
                      <Text style={{ color: t.colors.primary, fontWeight: "900", fontSize: 13 }}>
                        {item._count.kudos} Kudos
                      </Text>
                    </Pressable>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="chatbubble-outline" size={16} color={t.colors.textMuted} />
                      <Text style={{ color: t.colors.textMuted, fontWeight: "700", fontSize: 13 }}>
                        {item._count.comments}
                      </Text>
                    </View>
                  </View>

                  <Pressable hitSlop={10}>
                    <Ionicons name="share-social-outline" size={18} color={t.colors.textMuted} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}
