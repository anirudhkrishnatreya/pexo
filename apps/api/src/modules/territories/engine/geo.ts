/**
 * Pexo geospatial engine — dependency-free geometry primitives used by the
 * territory-conquest system. All functions operate on WGS84 lat/lng points.
 */

export type GeoPoint = {
  lat: number
  lng: number
  /** Unix epoch milliseconds */
  t: number
  /** Elevation in meters (optional) */
  ele?: number
  /** Reported GPS horizontal accuracy in meters (optional) */
  acc?: number
  /** Heart rate (optional) */
  hr?: number
}

const EARTH_RADIUS_M = 6_371_008.8

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance between two points in meters. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Total path length in meters. */
export function pathDistanceMeters(points: ReadonlyArray<{ lat: number; lng: number }>): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i])
  }
  return total
}

/**
 * Project lat/lng to local planar meters (equirectangular around a reference
 * latitude). Accurate enough for territory-sized polygons (< ~50 km).
 */
export function projectToMeters(
  points: ReadonlyArray<{ lat: number; lng: number }>,
): Array<{ x: number; y: number }> {
  if (points.length === 0) return []
  const refLat = toRad(points[0].lat)
  return points.map((p) => ({
    x: toRad(p.lng) * EARTH_RADIUS_M * Math.cos(refLat),
    y: toRad(p.lat) * EARTH_RADIUS_M,
  }))
}

/** Shoelace polygon area in square meters on the local projection. */
export function polygonAreaSqMeters(points: ReadonlyArray<{ lat: number; lng: number }>): number {
  const proj = projectToMeters(points)
  let area = 0
  const n = proj.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += proj[i].x * proj[j].y - proj[j].x * proj[i].y
  }
  return Math.abs(area) / 2
}

/**
 * Isoperimetric quotient in [0, 1]: 4πA / P².
 * A circle scores 1. An out-and-back path scores ~0. Used to reject GPS
 * tracks that technically close a loop but never enclose meaningful area.
 */
export function loopCompactness(areaSqM: number, perimeterM: number): number {
  if (perimeterM <= 0) return 0
  return (4 * Math.PI * areaSqM) / (perimeterM * perimeterM)
}

/** Whether start and end of the track are within `maxGapMeters`. */
export function isClosedLoop(
  points: ReadonlyArray<{ lat: number; lng: number }>,
  maxGapMeters = 75,
): boolean {
  if (points.length < 4) return false
  return haversineMeters(points[0], points[points.length - 1]) <= maxGapMeters
}

/** Ramer–Douglas–Peucker simplification with an epsilon in meters. */
export function simplifyPath<T extends { lat: number; lng: number }>(
  points: ReadonlyArray<T>,
  epsilonMeters = 5,
): T[] {
  if (points.length <= 2) return [...points]
  const proj = projectToMeters(points)

  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true

  const stack: Array<[number, number]> = [[0, points.length - 1]]
  while (stack.length) {
    const [start, end] = stack.pop()!
    let maxDist = 0
    let index = -1
    const sx = proj[start].x
    const sy = proj[start].y
    const ex = proj[end].x
    const ey = proj[end].y
    const dx = ex - sx
    const dy = ey - sy
    const lenSq = dx * dx + dy * dy

    for (let i = start + 1; i < end; i++) {
      let dist: number
      if (lenSq === 0) {
        dist = Math.hypot(proj[i].x - sx, proj[i].y - sy)
      } else {
        const t = Math.max(0, Math.min(1, ((proj[i].x - sx) * dx + (proj[i].y - sy) * dy) / lenSq))
        dist = Math.hypot(proj[i].x - (sx + t * dx), proj[i].y - (sy + t * dy))
      }
      if (dist > maxDist) {
        maxDist = dist
        index = i
      }
    }

    if (maxDist > epsilonMeters && index !== -1) {
      keep[index] = true
      stack.push([start, index], [index, end])
    }
  }

  return points.filter((_, i) => keep[i])
}

/** Ray-casting point-in-polygon test. Polygon is an array of lat/lng vertices. */
export function pointInPolygon(
  point: { lat: number; lng: number },
  polygon: ReadonlyArray<{ lat: number; lng: number }>,
): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i].lat
    const xi = polygon[i].lng
    const yj = polygon[j].lat
    const xj = polygon[j].lng
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Polygon centroid (average of vertices — sufficient for territory pins). */
export function centroid(points: ReadonlyArray<{ lat: number; lng: number }>): {
  lat: number
  lng: number
} {
  const n = points.length
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / n, lng: sum.lng / n }
}

/** Approximate overlap: fraction of polygon B's vertices inside polygon A. */
export function vertexOverlapFraction(
  a: ReadonlyArray<{ lat: number; lng: number }>,
  b: ReadonlyArray<{ lat: number; lng: number }>,
): number {
  if (b.length === 0) return 0
  const inside = b.filter((p) => pointInPolygon(p, a)).length
  return inside / b.length
}

/** Encode a track as a Google encoded polyline (precision 5). */
export function encodePolyline(points: ReadonlyArray<{ lat: number; lng: number }>): string {
  let lastLat = 0
  let lastLng = 0
  let result = ""

  const encodeValue = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1
    let out = ""
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }
    out += String.fromCharCode(v + 63)
    return out
  }

  for (const p of points) {
    const lat = Math.round(p.lat * 1e5)
    const lng = Math.round(p.lng * 1e5)
    result += encodeValue(lat - lastLat) + encodeValue(lng - lastLng)
    lastLat = lat
    lastLng = lng
  }
  return result
}
