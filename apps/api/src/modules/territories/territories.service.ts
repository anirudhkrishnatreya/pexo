import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { ActivityKind } from "./engine/anti-cheat"
import { STEAL_MARGIN, evaluateCapture, rarityForArea } from "./engine/capture"
import { GeoPoint, vertexOverlapFraction } from "./engine/geo"

@Injectable()
export class TerritoriesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Evaluate an activity for territory conquest.
   * - If the loop overlaps an existing territory ≥ 60%, it's a steal attempt:
   *   the challenger's score must beat owner's score by the steal margin.
   * - Otherwise a brand-new territory is founded.
   */
  async attemptCapture(
    userId: string,
    activityId: string,
    kind: ActivityKind,
    points: GeoPoint[],
  ) {
    const evaluation = evaluateCapture(points, kind)
    if (!evaluation.valid || !evaluation.centroid) {
      return { captured: false, evaluation }
    }

    const durationSec = Math.round((points[points.length - 1].t - points[0].t) / 1000)

    // Find overlapping candidate territories near the centroid.
    // (Bounding-box prefilter; production migration adds a PostGIS GiST index
    // and ST_Intersects for exact overlap — see docs/DATABASE.md.)
    const latDelta = 0.05
    const lngDelta = 0.05
    const candidates = await this.prisma.territory.findMany({
      where: {
        centroidLat: { gte: evaluation.centroid.lat - latDelta, lte: evaluation.centroid.lat + latDelta },
        centroidLng: { gte: evaluation.centroid.lng - lngDelta, lte: evaluation.centroid.lng + lngDelta },
      },
    })

    let target = null as (typeof candidates)[number] | null
    for (const t of candidates) {
      const ring = (t.polygon as Array<{ lat: number; lng: number }>) ?? []
      if (vertexOverlapFraction(evaluation.polygon, ring) >= 0.6) {
        target = t
        break
      }
    }

    if (target) {
      // Steal attempt
      if (target.ownerId === userId) {
        // Re-capture of own territory: refresh score if better.
        if (evaluation.score > target.captureScore) {
          await this.prisma.territory.update({
            where: { id: target.id },
            data: { captureScore: evaluation.score, capturedAt: new Date() },
          })
        }
        return { captured: false, reinforced: true, territoryId: target.id, evaluation }
      }

      if (evaluation.score < target.captureScore * STEAL_MARGIN) {
        return {
          captured: false,
          stealFailed: true,
          required: Math.round(target.captureScore * STEAL_MARGIN * 10) / 10,
          achieved: evaluation.score,
          evaluation,
        }
      }

      const previousOwnerId = target.ownerId
      const [territory, capture] = await this.prisma.$transaction([
        this.prisma.territory.update({
          where: { id: target.id },
          data: {
            ownerId: userId,
            captureScore: evaluation.score,
            capturedAt: new Date(),
            xpValue: evaluation.xp,
          },
        }),
        this.prisma.territoryCapture.create({
          data: {
            territoryId: target.id,
            userId,
            activityId,
            activityType: kind,
            distanceM: evaluation.perimeterM,
            durationSec,
            score: evaluation.score,
            xpAwarded: evaluation.xp,
            stolenFromId: previousOwnerId,
          },
        }),
        this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: evaluation.xp } } }),
      ])

      if (previousOwnerId) {
        await this.prisma.notification.create({
          data: {
            userId: previousOwnerId,
            type: "TERRITORY_LOST",
            title: "Territory lost!",
            body: `Your territory "${territory.name}" has been conquered`, 
            data: { territoryId: territory.id },
          },
        })
      }
      await this.redis.zIncrLeaderboard("territories:alltime", userId, 1)

      return { captured: true, stolen: true, territory, capture, evaluation }
    }

    // Found a new territory
    const rarity = rarityForArea(evaluation.areaSqM)
    const territory = await this.prisma.territory.create({
      data: {
        name: `Territory ${evaluation.centroid.lat.toFixed(3)}, ${evaluation.centroid.lng.toFixed(3)}`,
        ownerId: userId,
        polygon: evaluation.polygon as unknown as object,
        centroidLat: evaluation.centroid.lat,
        centroidLng: evaluation.centroid.lng,
        areaSqM: evaluation.areaSqM,
        perimeterM: evaluation.perimeterM,
        rarity,
        xpValue: evaluation.xp,
        captureScore: evaluation.score,
        capturedAt: new Date(),
      },
    })

    const capture = await this.prisma.territoryCapture.create({
      data: {
        territoryId: territory.id,
        userId,
        activityId,
        activityType: kind,
        distanceM: evaluation.perimeterM,
        durationSec,
        score: evaluation.score,
        xpAwarded: evaluation.xp,
      },
    })

    await this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: evaluation.xp } } })
    await this.prisma.notification.create({
      data: {
        userId,
        type: "TERRITORY_CAPTURED",
        title: "Territory captured!",
        body: `You conquered ${(evaluation.areaSqM / 10000).toFixed(1)} hectares (+${evaluation.xp} XP)`,
        data: { territoryId: territory.id },
      },
    })
    await this.redis.zIncrLeaderboard("territories:alltime", userId, 1)

    return { captured: true, stolen: false, territory, capture, evaluation }
  }

  /** Territories within a map viewport. */
  async inBounds(minLat: number, maxLat: number, minLng: number, maxLng: number) {
    return this.prisma.territory.findMany({
      where: {
        centroidLat: { gte: minLat, lte: maxLat },
        centroidLng: { gte: minLng, lte: maxLng },
      },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
      },
      take: 300,
    })
  }

  async findOne(id: string) {
    const territory = await this.prisma.territory.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
        captures: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, username: true, displayName: true } } },
        },
      },
    })
    if (!territory) throw new NotFoundException("Territory not found")
    return territory
  }

  async listForUser(userId: string) {
    return this.prisma.territory.findMany({
      where: { ownerId: userId },
      orderBy: { capturedAt: "desc" },
    })
  }
}
