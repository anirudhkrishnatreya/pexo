import { evaluateCapture, rarityForArea } from "./capture"
import { GeoPoint, haversineMeters, isClosedLoop, loopCompactness, pathDistanceMeters, polygonAreaSqMeters, simplifyPath } from "./geo"
import { analyzeTrack } from "./anti-cheat"

/** Generate a circular GPS loop of a given radius, walked at a given speed. */
function circularTrack(opts: {
  centerLat?: number
  centerLng?: number
  radiusM: number
  points?: number
  speedMps: number
  jitterM?: number
}): GeoPoint[] {
  const { centerLat = 12.9716, centerLng = 77.5946, radiusM, points = 120, speedMps, jitterM = 2 } = opts
  const metersPerDegLat = 111_320
  const metersPerDegLng = 111_320 * Math.cos((centerLat * Math.PI) / 180)
  const segLen = (2 * Math.PI * radiusM) / points
  const track: GeoPoint[] = []
  const start = Date.now()
  let tSec = 0

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    // deterministic pseudo-jitter so positions wobble like real GPS
    const jitter = Math.sin(i * 7.13) * jitterM
    const r = radiusM + jitter
    if (i > 0) {
      // Real athletes vary pace ~15%; jitterM === 0 simulates a synthetic
      // constant-speed bot track (used by the anti-cheat specs).
      const segSpeed = jitterM > 0 ? speedMps * (1 + 0.15 * Math.sin(i * 1.7)) : speedMps
      tSec += segLen / segSpeed
    }
    track.push({
      lat: centerLat + (r * Math.sin(angle)) / metersPerDegLat,
      lng: centerLng + (r * Math.cos(angle)) / metersPerDegLng,
      t: start + Math.round(tSec * 1000),
      acc: 8,
    })
  }
  return track
}

describe("geo primitives", () => {
  it("haversine: ~111 km per degree of latitude", () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })

  it("detects closed vs open loops", () => {
    const loop = circularTrack({ radiusM: 200, speedMps: 3 })
    expect(isClosedLoop(loop)).toBe(true)
    const open = loop.slice(0, Math.floor(loop.length * 0.6))
    expect(isClosedLoop(open)).toBe(false)
  })

  it("computes circle area within 5% of πr²", () => {
    const loop = circularTrack({ radiusM: 300, speedMps: 3, jitterM: 0 })
    const area = polygonAreaSqMeters(loop)
    const expected = Math.PI * 300 * 300
    expect(Math.abs(area - expected) / expected).toBeLessThan(0.05)
  })

  it("simplification keeps endpoints and reduces points", () => {
    const loop = circularTrack({ radiusM: 300, speedMps: 3 })
    const simple = simplifyPath(loop, 10)
    expect(simple.length).toBeLessThan(loop.length)
    expect(simple[0]).toEqual(loop[0])
    expect(simple[simple.length - 1]).toEqual(loop[loop.length - 1])
  })

  it("compactness: circle ~1, out-and-back ~0", () => {
    const loop = circularTrack({ radiusM: 300, speedMps: 3, jitterM: 0 })
    const q = loopCompactness(polygonAreaSqMeters(loop), pathDistanceMeters(loop))
    expect(q).toBeGreaterThan(0.9)
  })
})

describe("anti-cheat", () => {
  it("accepts a genuine run", () => {
    const track = circularTrack({ radiusM: 300, speedMps: 3.2 })
    const verdict = analyzeTrack(track, "RUN")
    expect(verdict.genuine).toBe(true)
  })

  it("rejects vehicle-speed 'runs'", () => {
    const track = circularTrack({ radiusM: 1000, speedMps: 15 })
    const verdict = analyzeTrack(track, "RUN")
    expect(verdict.genuine).toBe(false)
    expect(verdict.flags).toContain("SPEED_EXCEEDS_HUMAN_LIMIT")
  })

  it("rejects teleport jumps (GPS spoofing)", () => {
    const track = circularTrack({ radiusM: 300, speedMps: 3 })
    // inject a 5 km teleport mid-track
    track[60] = { ...track[60], lat: track[60].lat + 0.05 }
    const verdict = analyzeTrack(track, "RUN")
    expect(verdict.genuine).toBe(false)
    expect(verdict.flags).toContain("TELEPORT_JUMP")
  })

  it("rejects synthetic constant-speed tracks (bots)", () => {
    const track = circularTrack({ radiusM: 300, speedMps: 3, jitterM: 0 })
    const verdict = analyzeTrack(track, "RUN")
    expect(verdict.flags).toContain("SYNTHETIC_CONSTANT_SPEED")
    expect(verdict.genuine).toBe(false)
  })
})

describe("territory capture", () => {
  it("grants capture for a genuine closed loop around a park", () => {
    const track = circularTrack({ radiusM: 250, speedMps: 3 })
    const result = evaluateCapture(track, "RUN")
    expect(result.valid).toBe(true)
    expect(result.areaSqM).toBeGreaterThan(150_000)
    expect(result.xp).toBeGreaterThan(0)
    expect(result.score).toBeGreaterThan(0)
    expect(result.polygon.length).toBeGreaterThan(3)
  })

  it("rejects an out-and-back path (no enclosed area)", () => {
    const start = Date.now()
    const track: GeoPoint[] = []
    for (let i = 0; i <= 100; i++) {
      const frac = i <= 50 ? i / 50 : (100 - i) / 50
      track.push({
        lat: 12.9716 + frac * 0.01 + Math.sin(i * 3.7) * 0.00002,
        lng: 77.5946,
        t: start + i * 10_000,
        acc: 8,
      })
    }
    const result = evaluateCapture(track, "RUN")
    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r === "LOOP_NOT_COMPACT" || r === "AREA_TOO_SMALL")).toBe(true)
  })

  it("rejects tiny loops", () => {
    const track = circularTrack({ radiusM: 30, speedMps: 2.5 })
    const result = evaluateCapture(track, "WALK")
    expect(result.valid).toBe(false)
    expect(result.reasons).toContain("AREA_TOO_SMALL")
  })

  it("rejects spoofed loops even when geometry is perfect", () => {
    const track = circularTrack({ radiusM: 400, speedMps: 30 })
    const result = evaluateCapture(track, "RUN")
    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.startsWith("ANTI_CHEAT_REJECTED"))).toBe(true)
  })

  it("classifies rarity by area", () => {
    expect(rarityForArea(100_000)).toBe("COMMON")
    expect(rarityForArea(600_000)).toBe("RARE")
    expect(rarityForArea(6_000_000)).toBe("LEGENDARY")
  })
})
