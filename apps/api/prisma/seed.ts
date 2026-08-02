/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client"
import * as argon2 from "argon2"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding rich Pexo dummy data…")

  const password = await argon2.hash("Password123!")

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@pexo.app" },
    update: {},
    create: {
      email: "admin@pexo.app",
      username: "pexo_admin",
      displayName: "Pexo Admin",
      passwordHash: password,
      role: "SUPER_ADMIN",
      emailVerified: true,
    },
  })

  const demo = await prisma.user.upsert({
    where: { email: "demo@pexo.app" },
    update: { xp: 3450, level: 4 },
    create: {
      email: "demo@pexo.app",
      username: "demo_athlete",
      displayName: "Anirudh Sharma",
      passwordHash: password,
      emailVerified: true,
      heightCm: 178,
      weightKg: 74,
      bio: "Distance Runner & Cyclist · Conquering city loops 🏃‍♂️⚡",
      xp: 3450,
      level: 4,
    },
  })

  const rival = await prisma.user.upsert({
    where: { email: "rival@pexo.app" },
    update: { xp: 4100, level: 5 },
    create: {
      email: "rival@pexo.app",
      username: "territory_rival",
      displayName: "Marcus Vance",
      passwordHash: password,
      emailVerified: true,
      bio: "Trail runner & KOM hunter 🏔️",
      xp: 4100,
      level: 5,
    },
  })

  const sarah = await prisma.user.upsert({
    where: { email: "sarah@pexo.app" },
    update: { xp: 2900, level: 3 },
    create: {
      email: "sarah@pexo.app",
      username: "sarah_fit",
      displayName: "Sarah Chen",
      passwordHash: password,
      emailVerified: true,
      bio: "Marathon training | Coffee & Miles ☕🏃‍♀️",
      xp: 2900,
      level: 3,
    },
  })

  const rohan = await prisma.user.upsert({
    where: { email: "rohan@pexo.app" },
    update: { xp: 1800, level: 2 },
    create: {
      email: "rohan@pexo.app",
      username: "rohan_runs",
      displayName: "Rohan Mehta",
      passwordHash: password,
      emailVerified: true,
      bio: "Weekend warrior 🌄 Building my empire one run at a time",
      xp: 1800,
      level: 2,
    },
  })

  const priya = await prisma.user.upsert({
    where: { email: "priya@pexo.app" },
    update: { xp: 5200, level: 6 },
    create: {
      email: "priya@pexo.app",
      username: "priya_queen",
      displayName: "Priya Nair",
      passwordHash: password,
      emailVerified: true,
      bio: "Ultra runner 🏔️ | 6 territories and counting 👑",
      xp: 5200,
      level: 6,
    },
  })

  // 2. Follows
  await prisma.follow.upsert({
    where: { followerId_followeeId: { followerId: demo.id, followeeId: rival.id } },
    update: {},
    create: { followerId: demo.id, followeeId: rival.id },
  })
  await prisma.follow.upsert({
    where: { followerId_followeeId: { followerId: demo.id, followeeId: sarah.id } },
    update: {},
    create: { followerId: demo.id, followeeId: sarah.id },
  })

  // 3. Badges
  const badges = [
    { slug: "first-conquest", name: "First Conquest", description: "Capture your first territory" },
    { slug: "kingdom-builder", name: "Kingdom Builder", description: "Own 5 territories at once" },
    { slug: "marathoner", name: "Marathoner", description: "Run 42.2 km in a single activity" },
    { slug: "hydrated", name: "Hydration Hero", description: "Hit your water goal 7 days in a row" },
    { slug: "legendary-lord", name: "Legendary Lord", description: "Capture a legendary territory", premiumOnly: true },
  ]
  for (const b of badges) {
    await prisma.badge.upsert({ where: { slug: b.slug }, update: {}, create: b })
  }

  // 4. Food Database Starter
  const foods = [
    { name: "Banana", servingDesc: "1 medium (118 g)", servingG: 118, calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, verified: true },
    { name: "Chicken Breast (grilled)", servingDesc: "150 g", servingG: 150, calories: 247, proteinG: 46, carbsG: 0, fatG: 5.4, verified: true },
    { name: "Basmati Rice (cooked)", servingDesc: "1 cup (163 g)", servingG: 163, calories: 210, proteinG: 4.4, carbsG: 45.6, fatG: 0.5, verified: true },
    { name: "Whole Egg (boiled)", servingDesc: "2 large (100 g)", servingG: 100, calories: 156, proteinG: 12.6, carbsG: 1.2, fatG: 10.6, verified: true },
    { name: "Whey Protein Shake", brand: "Optimum Nutrition", servingDesc: "1 scoop (30 g)", servingG: 30, calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5, verified: true },
    { name: "Oats with Almond Milk", servingDesc: "1 bowl (250 g)", servingG: 250, calories: 280, proteinG: 9.5, carbsG: 48, fatG: 5.2, verified: true },
    { name: "Greek Yogurt with Berries", servingDesc: "200 g", servingG: 200, calories: 160, proteinG: 18, carbsG: 14, fatG: 2.1, verified: true },
  ]
  const createdFoods: Record<string, string> = {}
  for (const f of foods) {
    let existing = await prisma.foodItem.findFirst({ where: { name: f.name } })
    if (!existing) {
      existing = await prisma.foodItem.create({ data: f })
    }
    createdFoods[f.name] = existing.id
  }

  // Log food & water for Demo user today
  const now = new Date()
  await prisma.foodLog.deleteMany({ where: { userId: demo.id } })
  await prisma.waterLog.deleteMany({ where: { userId: demo.id } })

  if (createdFoods["Oats with Almond Milk"]) {
    await prisma.foodLog.create({
      data: { userId: demo.id, foodItemId: createdFoods["Oats with Almond Milk"], meal: "BREAKFAST", servings: 1 },
    })
  }
  if (createdFoods["Chicken Breast (grilled)"]) {
    await prisma.foodLog.create({
      data: { userId: demo.id, foodItemId: createdFoods["Chicken Breast (grilled)"], meal: "LUNCH", servings: 1 },
    })
  }
  if (createdFoods["Whey Protein Shake"]) {
    await prisma.foodLog.create({
      data: { userId: demo.id, foodItemId: createdFoods["Whey Protein Shake"], meal: "SNACK", servings: 1 },
    })
  }

  await prisma.waterLog.createMany({
    data: [
      { userId: demo.id, amountMl: 500 },
      { userId: demo.id, amountMl: 500 },
      { userId: demo.id, amountMl: 750 },
    ],
  })

  // 5. Wipe & Reseed Territories — 20 territories across Bengaluru, all players visible
  await prisma.territoryCapture.deleteMany({})
  await prisma.activity.deleteMany({})
  await prisma.territory.deleteMany({})

  // Helper: build a rectangular polygon {lat, lng} from center point + half-size in degrees
  function rect(cLat: number, cLng: number, dLat: number, dLng: number) {
    return [
      { lat: cLat - dLat, lng: cLng - dLng },
      { lat: cLat - dLat, lng: cLng + dLng },
      { lat: cLat + dLat, lng: cLng + dLng },
      { lat: cLat + dLat, lng: cLng - dLng },
      { lat: cLat - dLat, lng: cLng - dLng },
    ]
  }

  interface TerritoryInput {
    name: string
    ownerId: string | null
    centroidLat: number
    centroidLng: number
    areaSqM: number
    perimeterM: number
    rarity: "COMMON" | "RARE" | "LEGENDARY"
    city: string
    polygon: Array<{ lat: number; lng: number }>
    xpValue: number
    captureScore: number
    capturedAt: Date | null
  }

  const territorySeed: TerritoryInput[] = [
    // ── Anirudh's kingdom (demo) ──────────────────────────────────────────
    {
      name: "Cubbon Park Central Loop",
      ownerId: demo.id,
      centroidLat: 12.9756, centroidLng: 77.5925,
      areaSqM: 45000, perimeterM: 920, rarity: "LEGENDARY", city: "Bengaluru",
      polygon: rect(12.9756, 77.5925, 0.0015, 0.002),
      xpValue: 500, captureScore: 94.5,
      capturedAt: new Date(now.getTime() - 2 * 86400_000),
    },
    {
      name: "Ulsoor Lake Promenade",
      ownerId: demo.id,
      centroidLat: 12.9818, centroidLng: 77.6189,
      areaSqM: 19500, perimeterM: 520, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9818, 77.6189, 0.001, 0.0015),
      xpValue: 150, captureScore: 71.0,
      capturedAt: new Date(now.getTime() - 1 * 86400_000),
    },
    {
      name: "Lalbagh Botanical Garden",
      ownerId: demo.id,
      centroidLat: 12.9507, centroidLng: 77.5848,
      areaSqM: 38000, perimeterM: 840, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9507, 77.5848, 0.0014, 0.0018),
      xpValue: 320, captureScore: 87.2,
      capturedAt: new Date(now.getTime() - 3 * 86400_000),
    },

    // ── Marcus Vance's empire (rival) ─────────────────────────────────────
    {
      name: "Indiranagar 100ft Road Circuit",
      ownerId: rival.id,
      centroidLat: 12.9783, centroidLng: 77.6408,
      areaSqM: 28000, perimeterM: 680, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9783, 77.6408, 0.0012, 0.0016),
      xpValue: 300, captureScore: 82.0,
      capturedAt: new Date(now.getTime() - 4 * 86400_000),
    },
    {
      name: "Koramangala 5th Block Loop",
      ownerId: rival.id,
      centroidLat: 12.9352, centroidLng: 77.6245,
      areaSqM: 22000, perimeterM: 590, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9352, 77.6245, 0.001, 0.0013),
      xpValue: 180, captureScore: 75.5,
      capturedAt: new Date(now.getTime() - 6 * 86400_000),
    },
    {
      name: "Whitefield Tech Corridor",
      ownerId: rival.id,
      centroidLat: 12.9698, centroidLng: 77.7499,
      areaSqM: 55000, perimeterM: 1100, rarity: "LEGENDARY", city: "Bengaluru",
      polygon: rect(12.9698, 77.7499, 0.002, 0.0025),
      xpValue: 600, captureScore: 97.8,
      capturedAt: new Date(now.getTime() - 2 * 86400_000),
    },

    // ── Sarah Chen's territories ───────────────────────────────────────────
    {
      name: "Jayanagar 4th Block",
      ownerId: sarah.id,
      centroidLat: 12.9258, centroidLng: 77.5851,
      areaSqM: 16500, perimeterM: 500, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9258, 77.5851, 0.0009, 0.0012),
      xpValue: 140, captureScore: 68.0,
      capturedAt: new Date(now.getTime() - 7 * 86400_000),
    },
    {
      name: "HSR Layout Sector 7",
      ownerId: sarah.id,
      centroidLat: 12.9121, centroidLng: 77.6446,
      areaSqM: 25000, perimeterM: 640, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9121, 77.6446, 0.0011, 0.0015),
      xpValue: 280, captureScore: 79.3,
      capturedAt: new Date(now.getTime() - 5 * 86400_000),
    },
    {
      name: "BTM Layout Water Tank",
      ownerId: sarah.id,
      centroidLat: 12.9166, centroidLng: 77.6101,
      areaSqM: 12000, perimeterM: 430, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9166, 77.6101, 0.0008, 0.001),
      xpValue: 100, captureScore: 62.0,
      capturedAt: new Date(now.getTime() - 10 * 86400_000),
    },

    // ── Rohan Mehta's zones ───────────────────────────────────────────────
    {
      name: "Malleshwaram Circle",
      ownerId: rohan.id,
      centroidLat: 13.0027, centroidLng: 77.5706,
      areaSqM: 14000, perimeterM: 470, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(13.0027, 77.5706, 0.0009, 0.0011),
      xpValue: 120, captureScore: 65.5,
      capturedAt: new Date(now.getTime() - 8 * 86400_000),
    },
    {
      name: "Rajajinagar Sports Complex",
      ownerId: rohan.id,
      centroidLat: 12.9937, centroidLng: 77.5536,
      areaSqM: 20000, perimeterM: 560, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9937, 77.5536, 0.001, 0.0014),
      xpValue: 240, captureScore: 76.0,
      capturedAt: new Date(now.getTime() - 3 * 86400_000),
    },

    // ── Priya Nair's conquered empire ────────────────────────────────────
    {
      name: "Electronic City Phase 1",
      ownerId: priya.id,
      centroidLat: 12.8448, centroidLng: 77.6604,
      areaSqM: 42000, perimeterM: 900, rarity: "LEGENDARY", city: "Bengaluru",
      polygon: rect(12.8448, 77.6604, 0.0016, 0.002),
      xpValue: 480, captureScore: 93.1,
      capturedAt: new Date(now.getTime() - 1 * 86400_000),
    },
    {
      name: "Bellandur Lake Trail",
      ownerId: priya.id,
      centroidLat: 12.9220, centroidLng: 77.6710,
      areaSqM: 30000, perimeterM: 720, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9220, 77.6710, 0.0013, 0.0017),
      xpValue: 350, captureScore: 85.4,
      capturedAt: new Date(now.getTime() - 2 * 86400_000),
    },
    {
      name: "Bannerghatta National Park Gate",
      ownerId: priya.id,
      centroidLat: 12.8006, centroidLng: 77.5767,
      areaSqM: 60000, perimeterM: 1300, rarity: "LEGENDARY", city: "Bengaluru",
      polygon: rect(12.8006, 77.5767, 0.0022, 0.003),
      xpValue: 700, captureScore: 99.0,
      capturedAt: new Date(now.getTime() - 12 * 3600_000),
    },

    // ── Unclaimed territories (available to conquer) ──────────────────────
    {
      name: "MG Road Metro Zone",
      ownerId: null,
      centroidLat: 12.9759, centroidLng: 77.6086,
      areaSqM: 18000, perimeterM: 530, rarity: "RARE", city: "Bengaluru",
      polygon: rect(12.9759, 77.6086, 0.001, 0.0013),
      xpValue: 260, captureScore: 0,
      capturedAt: null,
    },
    {
      name: "Domlur Flyover Loop",
      ownerId: null,
      centroidLat: 12.9609, centroidLng: 77.6387,
      areaSqM: 13000, perimeterM: 450, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9609, 77.6387, 0.0008, 0.0011),
      xpValue: 120, captureScore: 0,
      capturedAt: null,
    },
    {
      name: "Sarjapur Road Stretch",
      ownerId: null,
      centroidLat: 12.9081, centroidLng: 77.6835,
      areaSqM: 35000, perimeterM: 800, rarity: "LEGENDARY", city: "Bengaluru",
      polygon: rect(12.9081, 77.6835, 0.0015, 0.0019),
      xpValue: 550, captureScore: 0,
      capturedAt: null,
    },
    {
      name: "Richmond Circle",
      ownerId: null,
      centroidLat: 12.9659, centroidLng: 77.5997,
      areaSqM: 9000, perimeterM: 380, rarity: "COMMON", city: "Bengaluru",
      polygon: rect(12.9659, 77.5997, 0.0007, 0.0009),
      xpValue: 90, captureScore: 0,
      capturedAt: null,
    },
    {
      name: "Hebbal Lake Circuit",
      ownerId: null,
      centroidLat: 13.0358, centroidLng: 77.5970,
      areaSqM: 32000, perimeterM: 750, rarity: "RARE", city: "Bengaluru",
      polygon: rect(13.0358, 77.5970, 0.0013, 0.0016),
      xpValue: 310, captureScore: 0,
      capturedAt: null,
    },
  ]

  const createdTerritories: Record<string, { id: string }> = {}
  for (const tData of territorySeed) {
    const { capturedAt, ...rest } = tData
    const created = await prisma.territory.create({
      data: {
        ...rest,
        capturedAt: capturedAt ?? undefined,
      },
    })
    createdTerritories[tData.name] = { id: created.id }
  }

  console.log(`Created ${territorySeed.length} territories`)

  // 6. Sample Activities
  const samplePoints = [
    { lat: 12.9756, lng: 77.5925, t: Date.now() - 3600000 },
    { lat: 12.9760, lng: 77.5930, t: Date.now() - 3500000 },
    { lat: 12.9768, lng: 77.5938, t: Date.now() - 3400000 },
    { lat: 12.9756, lng: 77.5925, t: Date.now() - 3300000 },
  ]

  const rivalPoints = [
    { lat: 12.9783, lng: 77.6408, t: Date.now() - 7200000 },
    { lat: 12.9795, lng: 77.6420, t: Date.now() - 7100000 },
    { lat: 12.9800, lng: 77.6435, t: Date.now() - 7000000 },
    { lat: 12.9783, lng: 77.6408, t: Date.now() - 6900000 },
  ]

  const sarahPoints = [
    { lat: 12.9258, lng: 77.5851, t: Date.now() - 14400000 },
    { lat: 12.9268, lng: 77.5862, t: Date.now() - 14300000 },
    { lat: 12.9275, lng: 77.5870, t: Date.now() - 14200000 },
    { lat: 12.9258, lng: 77.5851, t: Date.now() - 14100000 },
  ]

  const a1 = await prisma.activity.create({
    data: {
      userId: demo.id,
      type: "RUN",
      title: "Morning Cubbon Park Loop 🏃⚡",
      description: "Pushed the tempo on the final 2 km. Felt smooth!",
      startedAt: new Date(now.getTime() - 3 * 3600 * 1000),
      endedAt: new Date(now.getTime() - 2.5 * 3600 * 1000),
      elapsedSec: 1620,
      movingSec: 1540,
      distanceM: 5420,
      avgSpeedMps: 3.52,
      maxSpeedMps: 4.85,
      elevGainM: 42,
      calories: 380,
      trackPoints: samplePoints,
      splits: [
        { km: 1, durationSec: 298, paceSecPerKm: 298 },
        { km: 2, durationSec: 301, paceSecPerKm: 301 },
        { km: 3, durationSec: 285, paceSecPerKm: 285 },
        { km: 4, durationSec: 292, paceSecPerKm: 292 },
        { km: 5, durationSec: 280, paceSecPerKm: 280 },
      ],
    },
  })

  await prisma.territoryCapture.create({
    data: {
      territoryId: createdTerritories["Cubbon Park Central Loop"].id,
      userId: demo.id,
      activityId: a1.id,
      activityType: "RUN",
      distanceM: 5420,
      durationSec: 1540,
      score: 94.5,
      xpAwarded: 500,
    },
  })

  const a2 = await prisma.activity.create({
    data: {
      userId: rival.id,
      type: "RIDE",
      title: "Indiranagar Speed Test 🚴💨",
      startedAt: new Date(now.getTime() - 14 * 3600 * 1000),
      endedAt: new Date(now.getTime() - 13 * 3600 * 1000),
      elapsedSec: 2800,
      movingSec: 2520,
      distanceM: 18400,
      avgSpeedMps: 7.3,
      maxSpeedMps: 11.2,
      elevGainM: 95,
      calories: 520,
      trackPoints: rivalPoints,
      splits: [
        { km: 1, durationSec: 138, paceSecPerKm: 138 },
        { km: 2, durationSec: 142, paceSecPerKm: 142 },
        { km: 3, durationSec: 135, paceSecPerKm: 135 },
      ],
    },
  })

  await prisma.territoryCapture.create({
    data: {
      territoryId: createdTerritories["Indiranagar 100ft Road Circuit"].id,
      userId: rival.id,
      activityId: a2.id,
      activityType: "RIDE",
      distanceM: 18400,
      durationSec: 2520,
      score: 82.0,
      xpAwarded: 300,
    },
  })

  const a3 = await prisma.activity.create({
    data: {
      userId: sarah.id,
      type: "RUN",
      title: "Sunrise 10K Endurance 🌅",
      startedAt: new Date(now.getTime() - 28 * 3600 * 1000),
      endedAt: new Date(now.getTime() - 27 * 3600 * 1000),
      elapsedSec: 3200,
      movingSec: 3060,
      distanceM: 10100,
      avgSpeedMps: 3.3,
      maxSpeedMps: 4.2,
      elevGainM: 65,
      calories: 680,
      trackPoints: sarahPoints,
      splits: [
        { km: 1, durationSec: 305, paceSecPerKm: 305 },
        { km: 2, durationSec: 310, paceSecPerKm: 310 },
        { km: 3, durationSec: 302, paceSecPerKm: 302 },
      ],
    },
  })

  const a4 = await prisma.activity.create({
    data: {
      userId: priya.id,
      type: "RUN",
      title: "Epic Kingdom Run — 5 Territories 👑",
      description: "Pushed hard through E-City and Bellandur. This city is mine!",
      startedAt: new Date(now.getTime() - 6 * 3600 * 1000),
      endedAt: new Date(now.getTime() - 5 * 3600 * 1000),
      elapsedSec: 3600,
      movingSec: 3500,
      distanceM: 14200,
      avgSpeedMps: 4.05,
      maxSpeedMps: 5.2,
      elevGainM: 110,
      calories: 920,
      trackPoints: samplePoints,
    },
  })

  // 7. Kudos & Comments
  await prisma.kudos.createMany({
    data: [
      { userId: rival.id, activityId: a1.id },
      { userId: sarah.id, activityId: a1.id },
      { userId: priya.id, activityId: a1.id },
      { userId: demo.id, activityId: a2.id },
      { userId: demo.id, activityId: a3.id },
      { userId: rival.id, activityId: a4.id },
      { userId: sarah.id, activityId: a4.id },
    ],
    skipDuplicates: true,
  })

  await prisma.comment.createMany({
    data: [
      { userId: rival.id, activityId: a1.id, body: "Insane pace on that last KM! 🔥" },
      { userId: sarah.id, activityId: a1.id, body: "Great run Anirudh! See you at Lalbagh?" },
      { userId: priya.id, activityId: a1.id, body: "I'm coming for Cubbon Park next 👑⚔️" },
      { userId: demo.id, activityId: a2.id, body: "I'm taking that territory back this weekend ⚔️" },
      { userId: demo.id, activityId: a4.id, body: "5 territories in one run — legend 🫡" },
      { userId: rival.id, activityId: a4.id, body: "How is that even possible 😤" },
    ],
    skipDuplicates: true,
  })

  console.log("Rich dummy data seed complete!")
  console.log("  Territories: 20 (Bengaluru-wide, all players)")
  console.log("  Users: demo / rival / sarah / rohan / priya")
  console.log("  Login: demo@pexo.app / Password123!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
