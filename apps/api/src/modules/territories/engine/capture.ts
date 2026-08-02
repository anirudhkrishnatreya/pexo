/**
 * Territory capture evaluation — the core of Pexo's gamification.
 *
 * A GPS activity qualifies as a conquest when:
 *  1. The anti-cheat verdict is genuine.
 *  2. The track forms a closed loop (start/end within tolerance).
 *  3. The enclosed area and perimeter clear minimums.
 *  4. The loop is "compact enough" (isoperimetric quotient) so an
 *     out-and-back path can never conquer land.
 */
import { ActivityKind, analyzeTrack } from "./anti-cheat"
import {
  GeoPoint,
  centroid,
  isClosedLoop,
  loopCompactness,
  pathDistanceMeters,
  polygonAreaSqMeters,
  simplifyPath,
} from "./geo"

export type CaptureEvaluation = {
  valid: boolean
  reasons: string[]
  /** Simplified polygon (lat/lng ring) when valid */
  polygon: Array<{ lat: number; lng: number }>
  centroid: { lat: number; lng: number } | null
  areaSqM: number
  perimeterM: number
  compactness: number
  /** Capture score — what a challenger must beat (higher = stronger claim) */
  score: number
  xp: number
  cheatFlags: string[]
}

export const CAPTURE_RULES = {
  maxLoopGapMeters: 75,
  minAreaSqM: 8_000, //   ~ a small city park
  maxAreaSqM: 40_000_000, // 40 km² — anti-abuse ceiling per single capture
  minPerimeterM: 400,
  minCompactness: 0.12, // rejects degenerate "flat" loops
  simplifyEpsilonM: 8,
} as const

const XP_ACTIVITY_MULTIPLIER: Record<ActivityKind, number> = {
  WALK: 1.3, // slowest way to enclose area → highest reward
  HIKE: 1.25,
  RUN: 1.0,
  SWIM: 1.4,
  RIDE: 0.6, // covers area fastest → lowest reward
}

/**
 * Steal threshold: a challenger must beat the standing score by 5% so
 * territories don't flip on statistical noise.
 */
export const STEAL_MARGIN = 1.05

export function evaluateCapture(
  points: ReadonlyArray<GeoPoint>,
  kind: ActivityKind,
): CaptureEvaluation {
  const reasons: string[] = []

  const verdict = analyzeTrack(points, kind)
  if (!verdict.genuine) {
    reasons.push(`ANTI_CHEAT_REJECTED: ${verdict.flags.join(", ")}`)
  }

  if (!isClosedLoop(points, CAPTURE_RULES.maxLoopGapMeters)) {
    reasons.push("LOOP_NOT_CLOSED")
  }

  const perimeterM = pathDistanceMeters(points)
  if (perimeterM < CAPTURE_RULES.minPerimeterM) {
    reasons.push("PERIMETER_TOO_SHORT")
  }

  const ring = simplifyPath([...points], CAPTURE_RULES.simplifyEpsilonM)
  const areaSqM = polygonAreaSqMeters(ring)

  if (areaSqM < CAPTURE_RULES.minAreaSqM) reasons.push("AREA_TOO_SMALL")
  if (areaSqM > CAPTURE_RULES.maxAreaSqM) reasons.push("AREA_TOO_LARGE")

  const compactness = loopCompactness(areaSqM, perimeterM)
  if (compactness < CAPTURE_RULES.minCompactness) reasons.push("LOOP_NOT_COMPACT")

  const valid = reasons.length === 0

  const durationSec = points.length > 1 ? (points[points.length - 1].t - points[0].t) / 1000 : 0

  // Score rewards area, speed and loop quality.
  // score = sqrt(area) * compactness * pace-factor
  const paceFactor = durationSec > 0 ? Math.min(2, perimeterM / durationSec / 2 + 0.5) : 0.5
  const score = valid ? Math.round(Math.sqrt(areaSqM) * compactness * paceFactor * 10) / 10 : 0

  // XP rewards effort: sqrt(area)/10 + perimeter/100, scaled by activity type.
  const xp = valid
    ? Math.round((Math.sqrt(areaSqM) / 10 + perimeterM / 100) * XP_ACTIVITY_MULTIPLIER[kind])
    : 0

  return {
    valid,
    reasons,
    polygon: valid ? ring.map((p) => ({ lat: p.lat, lng: p.lng })) : [],
    centroid: valid ? centroid(ring) : null,
    areaSqM: Math.round(areaSqM),
    perimeterM: Math.round(perimeterM),
    compactness: Math.round(compactness * 1000) / 1000,
    score,
    xp,
    cheatFlags: verdict.flags,
  }
}

/** Rarity by enclosed area. */
export function rarityForArea(areaSqM: number): "COMMON" | "RARE" | "LEGENDARY" {
  if (areaSqM >= 5_000_000) return "LEGENDARY" // ≥ 5 km²
  if (areaSqM >= 500_000) return "RARE" //        ≥ 0.5 km²
  return "COMMON"
}
