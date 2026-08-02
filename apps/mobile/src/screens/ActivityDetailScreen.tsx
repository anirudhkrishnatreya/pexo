import { Ionicons } from "@expo/vector-icons"
import { RouteProp, useRoute } from "@react-navigation/native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as Haptics from "expo-haptics"
import * as Sharing from "expo-sharing"
import React, { useRef, useState } from "react"
import { Alert, Dimensions, Modal, ScrollView, Text, View } from "react-native"
import MapView, { Polyline } from "react-native-maps"
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg"
import { captureRef } from "react-native-view-shot"
import { api } from "../api/client"
import { Avatar, Badge, Body, Button, Card, Header, Input, Screen, Stat } from "../components/ui"
import { formatDistance, formatDuration, formatPace, timeAgo } from "../lib/format"
import { RootStackParamList } from "../navigation"
import { useTheme } from "../theme"

type Detail = {
  id: string
  title: string
  type: string
  startedAt: string
  distanceM: number
  movingSec: number
  elevGainM: number
  calories: number
  avgSpeedMps: number
  trackPoints: Array<{ lat: number; lng: number }>
  splits: Array<{ km: number; durationSec: number; paceSecPerKm: number }> | null
  user: { displayName: string; username: string; level: number }
  capture: { xpAwarded: number; territory: { name: string } } | null
  _count: { kudos: number; comments: number }
}

type Comment = { id: string; body: string; createdAt: string; user: { displayName: string } }
type CommentsPage = { items: Comment[] }

// Normalize GPS coordinates to SVG canvas space
function normalizeCoords(
  coords: Array<{ latitude: number; longitude: number }>,
  width: number,
  height: number,
  padding = 24,
): Array<{ x: number; y: number }> {
  if (coords.length < 2) return []
  const lats = coords.map((c) => c.latitude)
  const lngs = coords.map((c) => c.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001
  const drawW = width - padding * 2
  const drawH = height - padding * 2
  const scale = Math.min(drawW / lngRange, drawH / latRange)
  const offsetX = (drawW - lngRange * scale) / 2 + padding
  const offsetY = (drawH - latRange * scale) / 2 + padding
  return coords.map((c) => ({
    x: (c.longitude - minLng) * scale + offsetX,
    y: height - ((c.latitude - minLat) * scale + offsetY),
  }))
}

function buildSvgPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ""
  return pts.reduce((d, pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `${d} L${pt.x},${pt.y}`), "")
}

const CARD_WIDTH = Dimensions.get("window").width - 40
const ROUTE_HEIGHT = CARD_WIDTH * 0.7

export function ActivityDetailScreen() {
  const t = useTheme()
  const route = useRoute<RouteProp<RootStackParamList, "ActivityDetail">>()
  const { activityId } = route.params
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState("")
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [exporting, setExporting] = useState(false)
  const cardRef = useRef<View>(null)

  const detail = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => api<Detail>(`/activities/${activityId}`),
  })
  const comments = useQuery({
    queryKey: ["comments", activityId],
    queryFn: () => api<CommentsPage>(`/social/activities/${activityId}/comments`),
  })
  const addComment = useMutation({
    mutationFn: (body: string) =>
      api(`/social/activities/${activityId}/comments`, { method: "POST", body: { body } }),
    onSuccess: () => {
      setDraft("")
      void queryClient.invalidateQueries({ queryKey: ["comments", activityId] })
    },
  })

  const handleExport = async () => {
    try {
      setExporting(true)
      if (!cardRef.current) {
        Alert.alert("Error", "Card not ready — please wait a moment and try again.")
        return
      }
      const uri = await captureRef(cardRef, { format: "png", quality: 1.0 })
      const available = await Sharing.isAvailableAsync()
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your PEXO Activity Card",
        })
      } else {
        Alert.alert("Sharing Unavailable", "Your device does not support native sharing.")
      }
      setShareModalVisible(false)
    } catch (err) {
      Alert.alert("Export Failed", err instanceof Error ? err.message : "Unable to export card.")
    } finally {
      setExporting(false)
    }
  }

  const a = detail.data
  if (!a) {
    return (
      <Screen>
        <Body muted>Loading activity details…</Body>
      </Screen>
    )
  }

  const coords = (a.trackPoints ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng }))
  const region = coords.length
    ? {
        latitude: coords[Math.floor(coords.length / 2)].latitude,
        longitude: coords[Math.floor(coords.length / 2)].longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : undefined

  const paceSecPerKm = a.distanceM > 0 ? a.movingSec / (a.distanceM / 1000) : 0

  // Normalised points for SVG route drawing on the share card
  const normalised = normalizeCoords(coords, CARD_WIDTH - 32, ROUTE_HEIGHT)
  const svgPath = buildSvgPath(normalised)

  return (
    <Screen style={{ paddingHorizontal: 16 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Athlete Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={a.user.displayName} level={a.user.level ?? 1} size={44} />
            <View>
              <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>{a.user.displayName}</Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>{timeAgo(a.startedAt)}</Text>
            </View>
          </View>
          <Badge label={a.type} variant="primary" />
        </View>

        {/* Activity Title */}
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4, marginBottom: 12 }}>
          {a.title}
        </Text>

        {/* Territory Conquest */}
        {a.capture && (
          <Card style={{ marginBottom: 14, borderColor: t.colors.accent, backgroundColor: "rgba(0,229,160,0.1)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="shield-checkmark" size={22} color={t.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.accent, fontWeight: "900", fontSize: 13, textTransform: "uppercase" }}>
                  CONQUERED "{a.capture.territory.name}"
                </Text>
                <Text style={{ color: t.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  +{a.capture.xpAwarded} XP awarded
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Map View */}
        {coords.length > 1 && (
          <Card style={{ height: 230, padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <MapView style={{ flex: 1 }} initialRegion={region} scrollEnabled={false} userInterfaceStyle="dark">
              <Polyline coordinates={coords} strokeColor={t.colors.primary} strokeWidth={5} />
            </MapView>
          </Card>
        )}

        {/* 4-Column Metric Box */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row" }}>
            <Stat label="DISTANCE" value={formatDistance(a.distanceM)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="AVG PACE" value={formatPace(paceSecPerKm)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="TIME" value={formatDuration(a.movingSec)} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="CALORIES" value={`${a.calories} kcal`} />
          </View>
        </Card>

        {/* Export Button */}
        <Button
          title="EXPORT ACTIVITY CARD 📸"
          variant="primary"
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setShareModalVisible(true)
          }}
          style={{ marginBottom: 18 }}
        />

        {/* Kilometer Splits */}
        {a.splits && a.splits.length > 0 && (
          <Card style={{ marginBottom: 18 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15, marginBottom: 12 }}>
              KILOMETER SPLITS
            </Text>
            {a.splits.map((s, idx) => (
              <View
                key={s.km}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: t.colors.border,
                }}
              >
                <Text style={{ color: t.colors.textMuted, fontWeight: "700" }}>KM {s.km}</Text>
                <Text style={{ color: t.colors.text, fontWeight: "900" }}>{formatPace(s.paceSecPerKm)} /km</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Comments */}
        <Header title={`Comments (${a._count.comments})`} />
        {(comments.data?.items ?? []).map((c) => (
          <Card key={c.id} style={{ marginBottom: 10, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 14 }}>{c.user.displayName}</Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 11 }}>{timeAgo(c.createdAt)}</Text>
            </View>
            <Text style={{ color: t.colors.textMuted, marginTop: 6, fontSize: 14 }}>{c.body}</Text>
          </Card>
        ))}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, alignItems: "center" }}>
          <Input
            placeholder="Add a comment…"
            value={draft}
            onChangeText={setDraft}
            style={{ flex: 1 }}
          />
          <Button
            title="SEND"
            onPress={() => draft.trim() && addComment.mutate(draft.trim())}
            loading={addComment.isPending}
            style={{ paddingHorizontal: 16 }}
          />
        </View>

        {/* ─── STRAVA-STYLE SHARE CARD MODAL ─── */}
        <Modal visible={shareModalVisible} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>

            {/* The actual capture target — exactly like Strava dark card */}
            <View
              ref={cardRef}
              collapsable={false}
              style={{
                width: CARD_WIDTH,
                backgroundColor: "#000000",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              {/* ── Top: stacked metrics (Strava style) ── */}
              <View style={{ paddingHorizontal: 28, paddingTop: 36, paddingBottom: 24 }}>
                {/* Distance */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>
                    Distance
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 54, fontWeight: "900", letterSpacing: -1, lineHeight: 60 }}>
                    {formatDistance(a.distanceM)}
                  </Text>
                </View>

                {/* Pace */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>
                    Pace
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "900", letterSpacing: -0.5, lineHeight: 46 }}>
                    {formatPace(paceSecPerKm)}
                  </Text>
                </View>

                {/* Time */}
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>
                    Time
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "900", letterSpacing: -0.5, lineHeight: 46 }}>
                    {formatDuration(a.movingSec)}
                  </Text>
                </View>
              </View>

              {/* ── Middle: SVG route drawn on black (exactly like Strava) ── */}
              <View style={{ width: CARD_WIDTH, height: ROUTE_HEIGHT, backgroundColor: "#000000" }}>
                {svgPath ? (
                  <Svg width={CARD_WIDTH - 32} height={ROUTE_HEIGHT} style={{ margin: 16 }}>
                    <Defs>
                      <LinearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#FC5200" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#FF8C42" stopOpacity="1" />
                      </LinearGradient>
                    </Defs>
                    {/* Glow shadow path */}
                    <Path
                      d={svgPath}
                      fill="none"
                      stroke="#FC5200"
                      strokeWidth={10}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main route line */}
                    <Path
                      d={svgPath}
                      fill="none"
                      stroke="url(#routeGrad)"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No route data</Text>
                  </View>
                )}
              </View>

              {/* ── Bottom: PEXO branding (where Strava puts its logo) ── */}
              <View style={{ paddingHorizontal: 28, paddingBottom: 28, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Text style={{ color: "rgba(255,255,255,0.18)", fontSize: 11, fontWeight: "700" }}>
                  {a.user.displayName.toUpperCase()}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 22, fontWeight: "900", letterSpacing: 4, textTransform: "uppercase" }}>
                  PEXO
                </Text>
              </View>
            </View>

            {/* Action buttons BELOW the card (not captured) */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 20, width: CARD_WIDTH }}>
              <Button
                title={exporting ? "EXPORTING…" : "SAVE & SHARE 📤"}
                variant="primary"
                onPress={() => void handleExport()}
                loading={exporting}
                style={{ flex: 1 }}
              />
              <Button
                title="CLOSE"
                variant="ghost"
                onPress={() => setShareModalVisible(false)}
                style={{ borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 18 }}
              />
            </View>
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 10, textAlign: "center" }}>
              Tap "Save & Share" → iOS Share Sheet → "Save Image"
            </Text>
          </View>
        </Modal>

      </ScrollView>
    </Screen>
  )
}
