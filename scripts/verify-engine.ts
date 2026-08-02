/**
 * Sanity harness for the territory conquest engine.
 * Run: npx tsx scripts/verify-engine.ts
 */
import { evaluateCapture } from "../apps/api/src/modules/territories/engine/capture"
import { analyzeTrack } from "../apps/api/src/modules/territories/engine/anti-cheat"
import {
  GeoPoint,
  isClosedLoop,
  polygonAreaSqMeters,
} from "../apps/api/src/modules/territories/engine/geo"

function circularTrack(radiusM: number, speedMps: number, jitterM = 2, points = 150): GeoPoint[] {
  const centerLat = 12.9716
  const centerLng = 77.5946
  const mPerDegLat = 111_320
  const mPerDegLng = 111_320 * Math.cos((centerLat * Math.PI) / 180)
  const segLen = (2 * Math.PI * radiusM) / points
  const start = Date.now()
  const track: GeoPoint[] = []
  let tSec = 0
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const r = radiusM + Math.sin(i * 7.13) * jitterM
    if (i > 0) {
      // Real athletes don't hold a perfectly constant pace; vary ~15% unless
      // jitterM is 0 (used to simulate a synthetic bot track).
      const segSpeed = jitterM > 0 ? speedMps * (1 + 0.15 * Math.sin(i * 1.7)) : speedMps
      tSec += segLen / segSpeed
    }
    track.push({
      lat: centerLat + (r * Math.sin(angle)) / mPerDegLat,
      lng: centerLng + (r * Math.cos(angle)) / mPerDegLng,
      t: start + Math.round(tSec * 1000),
      acc: 8,
    })
  }
  return track
}

let failures = 0
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
  if (!cond) failures++
}

// 1. Genuine 250m-radius running loop → captured
const goodLoop = circularTrack(250, 3.1)
const good = evaluateCapture(goodLoop, "RUN")
check(
  "genuine circular run captures territory",
  good.valid,
  `area=${Math.round(good.areaSqM)}m² score=${good.score.toFixed(1)} xp=${good.xp} reasons=[${good.reasons}]`,
)
check("closed loop detected", isClosedLoop(goodLoop))
check(
  "circle area ≈ πr²",
  Math.abs(polygonAreaSqMeters(goodLoop) - Math.PI * 250 * 250) / (Math.PI * 250 * 250) < 0.05,
)

// 2. Vehicle-speed "run" → rejected by anti-cheat
const carLoop = circularTrack(800, 16)
const car = evaluateCapture(carLoop, "RUN")
check("16 m/s 'run' rejected", !car.valid, `reasons=[${car.reasons}]`)

// 3. Teleport spoof → rejected
const spoof = circularTrack(300, 3)
spoof[70] = { ...spoof[70], lat: spoof[70].lat + 0.05 }
const spoofVerdict = analyzeTrack(spoof, "RUN")
check("teleport jump flagged", !spoofVerdict.genuine, `flags=[${spoofVerdict.flags}]`)

// 4. Bot-perfect constant speed → flagged
const bot = circularTrack(300, 3, 0)
const botVerdict = analyzeTrack(bot, "RUN")
check("synthetic constant speed flagged", botVerdict.flags.includes("SYNTHETIC_CONSTANT_SPEED"), `flags=[${botVerdict.flags}]`)

// 5. Tiny loop → area too small
const tiny = evaluateCapture(circularTrack(30, 2.5), "WALK")
check("tiny loop rejected", !tiny.valid, `reasons=[${tiny.reasons}]`)

// 6. Out-and-back → no enclosed area
const outBack: GeoPoint[] = []
const start = Date.now()
for (let i = 0; i <= 100; i++) {
  const frac = i <= 50 ? i / 50 : (100 - i) / 50
  outBack.push({
    lat: 12.9716 + frac * 0.01 + Math.sin(i * 3.7) * 0.00002,
    lng: 77.5946,
    t: start + i * 10_000,
    acc: 8,
  })
}
const ob = evaluateCapture(outBack, "RUN")
check("out-and-back rejected", !ob.valid, `reasons=[${ob.reasons}]`)

console.log(failures === 0 ? "\nAll engine checks passed." : `\n${failures} check(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
