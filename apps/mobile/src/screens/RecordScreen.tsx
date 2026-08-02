import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import * as Location from "expo-location"
import React, { useEffect, useRef, useState } from "react"
import { Alert, Pressable, Text, View } from "react-native"
import MapView, { Polygon, Polyline } from "react-native-maps"
import { api } from "../api/client"
import { Button, Stat } from "../components/ui"
import { formatDistance, formatDuration, formatPace } from "../lib/format"
import { useTheme } from "../theme"

type TrackPoint = { lat: number; lng: number; t: number; ele?: number; acc?: number }
type ActivityType = "RUN" | "WALK" | "RIDE" | "HIKE"

const AUTO_PAUSE_MPS = 0.4
// Capture rules (mirrored from backend — used for live client-side preview)
const LOOP_CLOSE_METERS = 75 // how close to start counts as "loop closed"
const MIN_PERIMETER_M = 400   // minimum loop perimeter
const MIN_AREA_SQ_M = 8_000   // minimum enclosed area

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  RUN: "🏃",
  WALK: "🚶",
  RIDE: "🚴",
  HIKE: "🥾",
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_008.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

function pathDistance(pts: TrackPoint[]): number {
  return pts.reduce((acc, p, i) => (i === 0 ? 0 : acc + haversine(pts[i - 1], p)), 0)
}

function polygonArea(pts: TrackPoint[]): number {
  if (pts.length < 3) return 0
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6_371_008.8
  const refLat = toRad(pts[0].lat)
  const proj = pts.map((p) => ({
    x: toRad(p.lng) * R * Math.cos(refLat),
    y: toRad(p.lat) * R,
  }))
  let area = 0
  const n = proj.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += proj[i].x * proj[j].y - proj[j].x * proj[i].y
  }
  return Math.abs(area) / 2
}

/** How close is the current position to the start of the track? 0–1 */
function loopCloseRatio(pts: TrackPoint[]): number {
  if (pts.length < 10) return 0
  const dist = haversine(pts[0], pts[pts.length - 1])
  return Math.max(0, 1 - dist / LOOP_CLOSE_METERS)
}

export function RecordScreen() {
  const t = useTheme()
  const [type, setType] = useState<ActivityType>("RUN")
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [pausedSec, setPausedSec] = useState(0)
  const [saving, setSaving] = useState(false)
  const subscription = useRef<Location.LocationSubscription | null>(null)
  const pausedRef = useRef(false)
  const mapRef = useRef<MapView>(null)

  const distanceM = pathDistance(points)
  const movingSec = Math.max(1, elapsedSec - pausedSec)
  const paceSecPerKm = distanceM > 0 ? movingSec / (distanceM / 1000) : 0

  // Live loop detection — computed from points in real-time
  const closeRatio = loopCloseRatio(points)
  const isLoopClosing = closeRatio > 0.3 && distanceM > MIN_PERIMETER_M * 0.5
  const isLoopClosed = closeRatio > 0.85 && distanceM >= MIN_PERIMETER_M
  const enclosedArea = isLoopClosing ? polygonArea(points) : 0
  const territoryReady = isLoopClosed && enclosedArea >= MIN_AREA_SQ_M

  // Rarity for the territory preview label
  const previewRarity = enclosedArea >= 5_000_000 ? "LEGENDARY" : enclosedArea >= 500_000 ? "RARE" : "COMMON"

  // Color for the loop fill based on how close they are to closing
  const loopFillColor = territoryReady
    ? "rgba(0,229,160,0.25)"      // green = ready to capture
    : isLoopClosing
    ? "rgba(252,82,0,0.18)"       // orange = getting closer
    : "rgba(255,255,255,0.05)"    // subtle default
  const loopStrokeColor = territoryReady ? "#00E5A0" : isLoopClosing ? "#FC5200" : t.colors.primary

  // Pulse haptic when loop first closes
  const prevClosed = useRef(false)
  useEffect(() => {
    if (territoryReady && !prevClosed.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    prevClosed.current = territoryReady
  }, [territoryReady])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1)
      if (pausedRef.current) setPausedSec((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [recording])

  const start = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Location required", "Pexo needs location access to record activities.")
      return
    }
    setPoints([])
    setElapsedSec(0)
    setPausedSec(0)
    setPaused(false)
    pausedRef.current = false
    setRecording(true)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (loc) => {
        const speed = loc.coords.speed ?? 0
        const autoPaused = speed >= 0 && speed < AUTO_PAUSE_MPS
        pausedRef.current = autoPaused || pausedRef.current
        if (pausedRef.current && !autoPaused) pausedRef.current = false

        if (!pausedRef.current) {
          setPoints((prev) => [
            ...prev,
            {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              t: loc.timestamp,
              ele: loc.coords.altitude ?? undefined,
              acc: loc.coords.accuracy ?? undefined,
            },
          ])
        }
        setPaused(pausedRef.current)
      },
    )
  }

  const stop = async () => {
    subscription.current?.remove()
    setRecording(false)

    if (points.length < 10) {
      Alert.alert("Too short", "Not enough GPS data to save this activity.")
      return
    }

    setSaving(true)
    try {
      const res = await api<{
        activity: { id: string }
        capture: null | {
          captured?: boolean
          stolen?: boolean
          stealFailed?: boolean
          reinforced?: boolean
          evaluation?: { xp?: number; polygon?: Array<{ lat: number; lng: number }>; areaSqM?: number; reasons?: string[] }
        }
      }>("/activities", {
        method: "POST",
        body: {
          type,
          title: `${ACTIVITY_ICONS[type]} ${type.charAt(0)}${type.slice(1).toLowerCase()} · ${new Date().toLocaleDateString()}`,
          trackPoints: points,
          pausedSec,
        },
      })

      if (res.capture && "captured" in res.capture && res.capture.captured) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        const areaHa = ((res.capture.evaluation?.areaSqM ?? 0) / 10_000).toFixed(1)
        Alert.alert(
          res.capture.stolen ? "Territory stolen! ⚔️" : "Territory captured! 🏰",
          `You now own ${areaHa} ha · +${res.capture.evaluation?.xp ?? 0} XP\n\nVisible on the map under your name!`,
        )
      } else if (res.capture?.stealFailed) {
        Alert.alert("Conquest failed ⚔️", "The current owner has a stronger claim. Train harder and try again!")
      } else if (res.capture?.reinforced) {
        Alert.alert("Territory reinforced! 🛡️", "You've strengthened your hold on this territory.")
      } else {
        const reasons = res.capture && "evaluation" in res.capture
          ? res.capture.evaluation?.reasons ?? []
          : []
        const hint = reasons.includes("LOOP_NOT_CLOSED")
          ? "Your route didn't close into a loop. Run back close to where you started."
          : reasons.includes("AREA_TOO_SMALL")
          ? "Enclose a larger area to capture territory."
          : "Great run! Close a GPS loop to capture territory on the map. 🗺️"
        Alert.alert("Activity saved! 💪", hint)
      }

      setPoints([])
      setElapsedSec(0)
      setPausedSec(0)
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again")
    } finally {
      setSaving(false)
    }
  }

  const region = points.length
    ? {
        latitude: points[points.length - 1].lat,
        longitude: points[points.length - 1].lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : undefined

  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }))

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Full-screen Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={region}
        showsUserLocation
        followsUserLocation
        userInterfaceStyle="dark"
      >
        {/* GPS Track Line */}
        {coords.length > 1 && (
          <Polyline
            coordinates={coords}
            strokeColor={loopStrokeColor}
            strokeWidth={4}
          />
        )}

        {/* Live territory preview polygon — shows when loop is closing */}
        {isLoopClosing && coords.length > 3 && (
          <Polygon
            coordinates={coords}
            fillColor={loopFillColor}
            strokeColor={loopStrokeColor}
            strokeWidth={territoryReady ? 3 : 2}
          />
        )}
      </MapView>

      {/* Activity type selector — top */}
      <View
        style={{
          position: "absolute",
          top: 56,
          left: 16,
          right: 16,
          flexDirection: "row",
          backgroundColor: "rgba(9,12,16,0.85)",
          borderRadius: 100,
          padding: 4,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
        }}
      >
        {(["RUN", "RIDE", "WALK", "HIKE"] as ActivityType[]).map((k) => {
          const active = type === k
          return (
            <Pressable
              key={k}
              onPress={() => !recording && setType(k)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: 100,
                backgroundColor: active ? t.colors.primary : "transparent",
              }}
            >
              <Text style={{ fontSize: 14 }}>{ACTIVITY_ICONS[k]}</Text>
              <Text style={{ color: active ? "#FFF" : t.colors.textMuted, fontWeight: "900", fontSize: 10, letterSpacing: 0.5, marginTop: 2 }}>
                {k}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Loop closing indicator — animated banner */}
      {recording && isLoopClosing && (
        <View
          style={{
            position: "absolute",
            top: 130,
            left: 20,
            right: 20,
            backgroundColor: territoryReady ? "rgba(0,229,160,0.95)" : "rgba(252,82,0,0.92)",
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 20 }}>{territoryReady ? "🏰" : "🔄"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>
              {territoryReady ? "LOOP CLOSED — TERRITORY READY!" : "CLOSING THE LOOP…"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" }}>
              {territoryReady
                ? `${(enclosedArea / 10_000).toFixed(1)} ha enclosed · ${previewRarity} territory · Finish to claim!`
                : `${Math.round(closeRatio * 100)}% closed · Run back towards your start point`}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom live dashboard */}
      <View
        style={{
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: "rgba(9,12,16,0.92)",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
          padding: 20,
        }}
      >
        {/* Hero distance */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: t.colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Distance
          </Text>
          <Text style={{ color: t.colors.text, fontSize: 48, fontWeight: "900", letterSpacing: -1.5, lineHeight: 54 }}>
            {(distanceM / 1000).toFixed(2)}
            <Text style={{ fontSize: 20, color: t.colors.textMuted, fontWeight: "700" }}> km</Text>
          </Text>
        </View>

        {/* Sub-stats row */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: t.colors.background,
            borderRadius: 14,
            paddingVertical: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <Stat label="TIME" value={formatDuration(movingSec)} />
          <View style={{ width: 1, backgroundColor: t.colors.border }} />
          <Stat label="AVG PACE" value={formatPace(paceSecPerKm)} />
          <View style={{ width: 1, backgroundColor: t.colors.border }} />
          <Stat label="TERRITORY" value={enclosedArea > 0 ? `${(enclosedArea / 10_000).toFixed(1)} ha` : "–"} />
        </View>

        {/* Auto-paused notice */}
        {paused && recording && (
          <Text style={{ color: t.colors.primary, fontWeight: "800", textAlign: "center", marginBottom: 10, fontSize: 12 }}>
            ⏸ AUTO-PAUSED — MOVE TO RESUME
          </Text>
        )}

        {/* How the territory system works — shown before start */}
        {!recording && (
          <View style={{ backgroundColor: "rgba(252,82,0,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(252,82,0,0.3)" }}>
            <Text style={{ color: t.colors.primary, fontWeight: "900", fontSize: 12, marginBottom: 4 }}>
              ⚡ HOW TERRITORY CAPTURE WORKS
            </Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 11, lineHeight: 17 }}>
              Run, walk, or hike a{" "}
              <Text style={{ color: t.colors.text, fontWeight: "800" }}>closed loop</Text>
              {" "}— when you return close to your starting point, the enclosed area becomes{" "}
              <Text style={{ color: t.colors.text, fontWeight: "800" }}>your territory</Text>
              {" "}on the map. Other players can steal it by running a bigger loop! 🗺️
            </Text>
          </View>
        )}

        {/* Start / Finish button */}
        {!recording ? (
          <Pressable
            onPress={() => void start()}
            style={{
              backgroundColor: t.colors.primary,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: t.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 1 }}>
              START ACTIVITY
            </Text>
          </Pressable>
        ) : (
          <Button
            title={saving ? "SAVING…" : territoryReady ? "FINISH & CLAIM TERRITORY 🏰" : "FINISH & SAVE"}
            variant={territoryReady ? "accent" : "danger"}
            onPress={() => void stop()}
            loading={saving}
          />
        )}
      </View>

      {/* Territory stats floating badge — only during recording when loop detected */}
      {recording && enclosedArea >= MIN_AREA_SQ_M && (
        <View
          style={{
            position: "absolute",
            top: 130,
            right: 16,
            backgroundColor: "rgba(0,0,0,0.8)",
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: t.colors.accent,
            alignItems: "center",
            minWidth: 70,
          }}
        >
          <Ionicons name="shield-checkmark" size={16} color={t.colors.accent} />
          <Text style={{ color: t.colors.accent, fontSize: 14, fontWeight: "900", marginTop: 2 }}>
            {(enclosedArea / 10_000).toFixed(1)}
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: 9, fontWeight: "700" }}>ha enclosed</Text>
        </View>
      )}
    </View>
  )
}
