import { ActivitiesService } from "./activities.service"
import { GeoPoint } from "../territories/engine/geo"

describe("ActivitiesService.computeStats", () => {
  const start = 1_700_000_000_000

  /** 2 km straight line north at ~3.33 m/s (5 min/km pace), 1 point per 30 m */
  function straightTrack(): GeoPoint[] {
    const points: GeoPoint[] = []
    const metersPerDegLat = 111_320
    const total = 2000
    const step = 30
    for (let m = 0; m <= total; m += step) {
      points.push({
        lat: 12.9 + m / metersPerDegLat,
        lng: 77.59,
        t: start + (m / 3.3333) * 1000,
        ele: 900 + (m / total) * 50, // 50 m of climbing
      })
    }
    return points
  }

  it("computes distance within 1%", () => {
    const stats = ActivitiesService.computeStats(straightTrack(), 0)
    expect(Math.abs(stats.distanceM - 2000)).toBeLessThan(20)
  })

  it("produces per-km splits at a ~5:00/km pace", () => {
    const stats = ActivitiesService.computeStats(straightTrack(), 0)
    expect(stats.splits.length).toBe(2)
    for (const split of stats.splits) {
      expect(split.paceSecPerKm).toBeGreaterThan(280)
      expect(split.paceSecPerKm).toBeLessThan(320)
    }
  })

  it("accumulates elevation gain", () => {
    const stats = ActivitiesService.computeStats(straightTrack(), 0)
    expect(stats.elevGainM).toBeGreaterThanOrEqual(49)
    expect(stats.elevGainM).toBeLessThanOrEqual(51)
  })

  it("subtracts paused time from moving time", () => {
    const stats = ActivitiesService.computeStats(straightTrack(), 60)
    expect(stats.movingSec).toBe(stats.elapsedSec - 60)
  })

  it("estimates calories from MET, weight and duration", () => {
    const kcal = ActivitiesService.estimateCalories("RUN", 3600, 70)
    expect(kcal).toBeGreaterThan(600)
    expect(kcal).toBeLessThan(800)
  })
})
