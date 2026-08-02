/**
 * Pexo anti-cheat heuristics.
 *
 * Server-side signal analysis of GPS tracks. Complements (never replaces)
 * client-side integrity checks (Play Integrity / DeviceCheck, root & mock
 * location detection) which are wired in the mobile app layer.
 */
import { GeoPoint, haversineMeters } from "./geo"

export type ActivityKind = "RUN" | "WALK" | "RIDE" | "SWIM" | "HIKE"

export type CheatVerdict = {
  /** true when the activity should be accepted */
  genuine: boolean
  /** heuristics that fired */
  flags: string[]
  /** 0..1 — higher is more suspicious */
  suspicion: number
}

/** Sustained speed ceilings (m/s) per activity type. Generous elite-level caps. */
const MAX_SUSTAINED_MPS: Record<ActivityKind, number> = {
  RUN: 6.5, //  ~2:33 min/km — faster than marathon WR pace
  WALK: 3.0,
  RIDE: 22.0, // ~79 km/h sustained
  SWIM: 2.4,
  HIKE: 3.5,
}

/** Hard instantaneous ceiling that suggests vehicle travel / teleporting. */
const TELEPORT_MPS = 42 // ~150 km/h

export function analyzeTrack(points: ReadonlyArray<GeoPoint>, kind: ActivityKind): CheatVerdict {
  const flags = new Set<string>()

  if (points.length < 10) {
    flags.add("TRACK_TOO_SHORT")
    return { genuine: false, flags: [...flags], suspicion: 1 }
  }

  const speeds: number[] = []
  let teleports = 0
  let badAccuracy = 0
  let nonMonotonicTime = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const dtSec = (curr.t - prev.t) / 1000

    if (dtSec <= 0) {
      nonMonotonicTime++
      continue
    }

    const mps = haversineMeters(prev, curr) / dtSec
    speeds.push(mps)

    if (mps > TELEPORT_MPS) teleports++
    if ((curr.acc ?? 0) > 60) badAccuracy++
  }

  if (nonMonotonicTime > 0) flags.add("NON_MONOTONIC_TIMESTAMPS")
  if (teleports > 0) flags.add("TELEPORT_JUMP")
  if (badAccuracy / points.length > 0.3) flags.add("LOW_GPS_ACCURACY")

  // Sustained speed: 95th percentile must respect the activity ceiling.
  const sorted = [...speeds].sort((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
  if (p95 > MAX_SUSTAINED_MPS[kind]) flags.add("SPEED_EXCEEDS_HUMAN_LIMIT")

  // Driving detection for foot activities: median speed in vehicle range.
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  if ((kind === "RUN" || kind === "WALK" || kind === "HIKE") && median > 7) {
    flags.add("LIKELY_VEHICLE")
  }

  // Bot detection: real GPS speed jitters. Near-zero variance = synthetic track.
  if (speeds.length >= 20) {
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length
    const variance = speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length
    const cv = mean > 0.5 ? Math.sqrt(variance) / mean : 1
    if (cv < 0.03) flags.add("SYNTHETIC_CONSTANT_SPEED")
  }

  // Sampling cadence: real recorders emit points every 1–10s. Sparse tracks
  // with huge hops are suspicious for capture-grade validation.
  const durationSec = (points[points.length - 1].t - points[0].t) / 1000
  if (durationSec / points.length > 30) flags.add("SPARSE_SAMPLING")

  const hardFlags = [
    "TELEPORT_JUMP",
    "SPEED_EXCEEDS_HUMAN_LIMIT",
    "LIKELY_VEHICLE",
    "SYNTHETIC_CONSTANT_SPEED",
    "NON_MONOTONIC_TIMESTAMPS",
  ]
  const hardHits = [...flags].filter((f) => hardFlags.includes(f)).length
  const suspicion = Math.min(1, hardHits * 0.5 + ([...flags].length - hardHits) * 0.15)

  return {
    genuine: hardHits === 0,
    flags: [...flags],
    suspicion,
  }
}
