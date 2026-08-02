import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import React, { useState } from "react"
import { Text, View } from "react-native"
import MapView, { Marker, Polygon, Region } from "react-native-maps"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { api } from "../api/client"
import { Badge, Button, Card } from "../components/ui"
import { formatArea } from "../lib/format"
import { useAuth } from "../store/auth"
import { useTheme } from "../theme"

type Territory = {
  id: string
  name: string
  polygon: Array<{ lat: number; lng: number }>
  areaSqM: number
  rarity: "COMMON" | "RARE" | "LEGENDARY"
  owner: { id: string; displayName: string } | null
  capturedAt?: string
}

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
}

/** Compute the centroid of a polygon for placing the label marker */
function getCentroid(points: Array<{ lat: number; lng: number }>): { latitude: number; longitude: number } {
  const n = points.length
  if (n === 0) return { latitude: 0, longitude: 0 }
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { latitude: sum.lat / n, longitude: sum.lng / n }
}

/** How long has a territory been held? */
function heldDuration(iso: string | undefined): string {
  if (!iso) return ""
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Rarity → fill + stroke colours */
function rarityColors(rarity: Territory["rarity"], isOwn: boolean, theme: ReturnType<typeof useTheme>) {
  if (isOwn) {
    return { fill: "rgba(0,229,160,0.22)", stroke: "#00E5A0" }
  }
  switch (rarity) {
    case "LEGENDARY":
      return { fill: "rgba(252,82,0,0.18)", stroke: "#FC5200" }
    case "RARE":
      return { fill: "rgba(130,80,255,0.18)", stroke: "#8250FF" }
    default:
      return { fill: "rgba(255,59,48,0.13)", stroke: theme.colors.danger }
  }
}

export function MapScreen() {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const me = useAuth((s) => s.user)
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [selected, setSelected] = useState<Territory | null>(null)

  const territories = useQuery({
    queryKey: [
      "territories",
      Math.round(region.latitude * 10),  // coarser key — refetch only on bigger map moves
      Math.round(region.longitude * 10),
    ],
    queryFn: () => {
      // Use a wide 0.5-degree bounding box so all city-wide territories load at once
      const latPad = Math.max(region.latitudeDelta, 0.4)
      const lngPad = Math.max(region.longitudeDelta, 0.4)
      return api<Territory[]>(
        `/territories?minLat=${region.latitude - latPad}` +
          `&maxLat=${region.latitude + latPad}` +
          `&minLng=${region.longitude - lngPad}` +
          `&maxLng=${region.longitude + lngPad}`,
      )
    },
    staleTime: 30_000, // cache for 30s — territories don't change every second
  })

  const items = territories.data ?? []
  const ownedCount = items.filter((t) => !!t.owner).length
  const unclaimedCount = items.filter((t) => !t.owner).length
  const myCount = items.filter((t) => t.owner?.id === me?.id).length

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        userInterfaceStyle="dark"
      >
        {items.map((territory) => {
          const own = territory.owner?.id === me?.id
          const center = getCentroid(territory.polygon)
          const { fill, stroke } = rarityColors(territory.rarity, own, t)
          const hasOwner = !!territory.owner

          return (
            <React.Fragment key={territory.id}>
              {/* Filled territory polygon */}
              <Polygon
                coordinates={territory.polygon.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                fillColor={fill}
                strokeColor={stroke}
                strokeWidth={own ? 3 : 2}
                tappable
                onPress={() => setSelected(territory)}
              />

              {/* Snake.io-style owner label — only if territory has an owner */}
              {hasOwner && (
                <Marker
                  coordinate={center}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  onPress={() => setSelected(territory)}
                >
                  <View
                    style={{
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {/* Crown / flag icon */}
                    <View
                      style={{
                        backgroundColor: own ? "#00E5A0" : territory.rarity === "LEGENDARY" ? "#FC5200" : "#8250FF",
                        borderRadius: 14,
                        width: 28,
                        height: 28,
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.6,
                        shadowRadius: 4,
                        elevation: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{own ? "👑" : territory.rarity === "LEGENDARY" ? "⚡" : "🏴"}</Text>
                    </View>

                    {/* Owner name tag (like snake.io name labels) */}
                    <View
                      style={{
                        backgroundColor: "rgba(0,0,0,0.85)",
                        borderRadius: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: own ? "#00E5A0" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <Text
                        style={{
                          color: own ? "#00E5A0" : "#FFFFFF",
                          fontSize: 10,
                          fontWeight: "900",
                          letterSpacing: 0.3,
                        }}
                        numberOfLines={1}
                      >
                        {territory.owner!.displayName}
                      </Text>
                      {/* Hold duration like a game clock */}
                      {territory.capturedAt && (
                        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 8, fontWeight: "700", textAlign: "center" }}>
                          ⏱ {heldDuration(territory.capturedAt)}
                        </Text>
                      )}
                    </View>
                  </View>
                </Marker>
              )}

              {/* Unclaimed territory: show a subtle flag */}
              {!hasOwner && (
                <Marker
                  coordinate={center}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  onPress={() => setSelected(territory)}
                >
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      borderRadius: 12,
                      paddingHorizontal: 6,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.15)",
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "700" }}>
                      UNCLAIMED
                    </Text>
                  </View>
                </Marker>
              )}
            </React.Fragment>
          )
        })}
      </MapView>

      {/* Top floating header pill */}
      <View
        style={{
          position: "absolute",
          top: Math.max(insets.top, 16) + 8,
          left: 16,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: t.colors.surfaceGlass,
          borderRadius: t.radius.pill,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="globe" size={18} color={t.colors.primary} />
          <View>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 13 }}>
              TERRITORY WAR
            </Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 10, fontWeight: "700" }}>
              {ownedCount} claimed · {unclaimedCount} unclaimed
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ alignItems: "center", backgroundColor: "rgba(0,229,160,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: t.colors.accent }}>
            <Text style={{ color: t.colors.accent, fontWeight: "900", fontSize: 16 }}>{myCount}</Text>
            <Text style={{ color: t.colors.accent, fontSize: 8, fontWeight: "800" }}>MINE</Text>
          </View>
        </View>
      </View>

      {/* Legend pill — bottom right */}
      <View
        style={{
          position: "absolute",
          bottom: Math.max(insets.bottom, 16) + (selected ? 140 : 20),
          right: 16,
          gap: 6,
        }}
      >
        {[
          { color: "#00E5A0", label: "YOURS" },
          { color: "#FC5200", label: "LEGENDARY" },
          { color: "#8250FF", label: "RARE" },
          { color: "#FF3B30", label: "COMMON" },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Selected territory bottom card */}
      {selected && (
        <Card
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 16) + 4,
            left: 16,
            right: 16,
            padding: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 17, flex: 1 }}>
              {selected.name}
            </Text>
            <Badge
              label={selected.rarity}
              variant={selected.rarity === "LEGENDARY" ? "primary" : selected.rarity === "RARE" ? "accent" : "muted"}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 16 }}>
              {selected.owner ? (selected.owner.id === me?.id ? "👑" : "🏴") : "🏳️"}
            </Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 13, flex: 1 }}>
              {selected.owner
                ? <>Owned by <Text style={{ color: t.colors.text, fontWeight: "800" }}>{selected.owner.displayName}</Text>{selected.capturedAt ? ` · held ${heldDuration(selected.capturedAt)}` : ""}</>
                : "Unclaimed — run through it to conquer!"}
            </Text>
          </View>

          <Text style={{ color: t.colors.textMuted, fontSize: 12, marginBottom: 14 }}>
            Area: {formatArea(selected.areaSqM)}
          </Text>

          <Button title="CLOSE" variant="ghost" onPress={() => setSelected(null)} style={{ paddingVertical: 10 }} />
        </Card>
      )}
    </View>
  )
}
