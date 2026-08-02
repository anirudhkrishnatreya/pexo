import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"
import { analyzeTrack } from "../territories/engine/anti-cheat"
import { GeoPoint, encodePolyline, haversineMeters, pathDistanceMeters } from "../territories/engine/geo"
import { TerritoriesService } from "../territories/territories.service"
import { CreateActivityDto } from "./dto/create-activity.dto"

const MET: Record<string, number> = { RUN: 9.8, WALK: 3.8, RIDE: 7.5, SWIM: 8.0, HIKE: 6.0 }

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private territories: TerritoriesService,
  ) {}

  async create(userId: string, dto: CreateActivityDto) {
    const points = dto.trackPoints as GeoPoint[]
    const stats = ActivitiesService.computeStats(points, dto.pausedSec ?? 0)
    const verdict = analyzeTrack(points, dto.type)

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const calories = ActivitiesService.estimateCalories(
      dto.type,
      stats.movingSec,
      user.weightKg ?? 70,
    )

    const activity = await this.prisma.activity.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility ?? "PUBLIC",
        startedAt: new Date(points[0].t),
        endedAt: new Date(points[points.length - 1].t),
        elapsedSec: stats.elapsedSec,
        movingSec: stats.movingSec,
        distanceM: stats.distanceM,
        avgSpeedMps: stats.avgSpeedMps,
        maxSpeedMps: stats.maxSpeedMps,
        elevGainM: stats.elevGainM,
        calories,
        avgHeartRate: dto.avgHeartRate,
        avgCadence: dto.avgCadence,
        polyline: encodePolyline(points),
        trackPoints: points as unknown as object,
        splits: stats.splits as unknown as object,
        cheatFlags: verdict.flags,
        verified: verdict.genuine,
      },
    })

    // Territory conquest evaluation (the Pexo USP) — only genuine activities.
    let capture = null
    if (verdict.genuine && dto.type !== "SWIM") {
      capture = await this.territories.attemptCapture(userId, activity.id, dto.type, points)
    }

    return { activity, capture, antiCheat: verdict }
  }

  async findOne(requesterId: string, id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
        _count: { select: { kudos: true, comments: true } },
        capture: { include: { territory: true } },
      },
    })
    if (!activity) throw new NotFoundException("Activity not found")

    if (activity.visibility === "PRIVATE" && activity.userId !== requesterId) {
      throw new ForbiddenException("This activity is private")
    }
    if (activity.visibility === "FOLLOWERS" && activity.userId !== requesterId) {
      const follows = await this.prisma.follow.findUnique({
        where: { followerId_followeeId: { followerId: requesterId, followeeId: activity.userId } },
      })
      if (!follows) throw new ForbiddenException("Followers-only activity")
    }
    return activity
  }

  async listForUser(requesterId: string, userId: string, dto: PaginationDto) {
    const isSelf = requesterId === userId
    const where = {
      userId,
      ...(isSelf ? {} : { visibility: "PUBLIC" as const }),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { startedAt: dto.order },
        skip: dto.skip,
        take: dto.limit,
        select: {
          id: true, type: true, title: true, startedAt: true, distanceM: true,
          movingSec: true, elevGainM: true, calories: true, polyline: true,
          _count: { select: { kudos: true, comments: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async delete(userId: string, id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } })
    if (!activity) throw new NotFoundException("Activity not found")
    if (activity.userId !== userId) throw new ForbiddenException()
    await this.prisma.activity.delete({ where: { id } })
    return { success: true }
  }

  /** Weekly summary used for reports and training-load style graphs. */
  async weeklyStats(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const activities = await this.prisma.activity.findMany({
      where: { userId, startedAt: { gte: since } },
      select: { type: true, distanceM: true, movingSec: true, calories: true, elevGainM: true },
    })
    const total = activities.reduce(
      (acc, a) => ({
        count: acc.count + 1,
        distanceM: acc.distanceM + a.distanceM,
        movingSec: acc.movingSec + a.movingSec,
        calories: acc.calories + a.calories,
        elevGainM: acc.elevGainM + a.elevGainM,
      }),
      { count: 0, distanceM: 0, movingSec: 0, calories: 0, elevGainM: 0 },
    )
    return { since, ...total }
  }

  static computeStats(points: GeoPoint[], pausedSec: number) {
    const distanceM = pathDistanceMeters(points)
    const elapsedSec = Math.max(1, Math.round((points[points.length - 1].t - points[0].t) / 1000))
    const movingSec = Math.max(1, elapsedSec - pausedSec)

    let maxSpeedMps = 0
    let elevGainM = 0
    const splits: Array<{ km: number; durationSec: number; paceSecPerKm: number }> = []
    let splitStartT = points[0].t
    let splitDistance = 0

    for (let i = 1; i < points.length; i++) {
      const d = haversineMeters(points[i - 1], points[i])
      const dt = (points[i].t - points[i - 1].t) / 1000
      if (dt > 0) maxSpeedMps = Math.max(maxSpeedMps, d / dt)

      const dEle = (points[i].ele ?? 0) - (points[i - 1].ele ?? 0)
      if (dEle > 0) elevGainM += dEle

      splitDistance += d
      if (splitDistance >= 1000) {
        const durationSec = Math.round((points[i].t - splitStartT) / 1000)
        splits.push({
          km: splits.length + 1,
          durationSec,
          paceSecPerKm: Math.round((durationSec / splitDistance) * 1000),
        })
        splitStartT = points[i].t
        splitDistance = 0
      }
    }

    return {
      distanceM: Math.round(distanceM),
      elapsedSec,
      movingSec,
      avgSpeedMps: Math.round((distanceM / movingSec) * 100) / 100,
      maxSpeedMps: Math.round(maxSpeedMps * 100) / 100,
      elevGainM: Math.round(elevGainM),
      splits,
    }
  }

  static estimateCalories(type: string, movingSec: number, weightKg: number): number {
    const met = MET[type] ?? 6
    return Math.round(((met * 3.5 * weightKg) / 200) * (movingSec / 60))
  }
}
