import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
  xp: true,
} as const

@Injectable()
export class LeaderboardsService {
  constructor(private prisma: PrismaService) {}

  /** Global XP ranking. */
  async globalXp(limit = 50) {
    const users = await this.prisma.user.findMany({
      where: { banned: false },
      orderBy: { xp: "desc" },
      take: limit,
      select: USER_SELECT,
    })
    return users.map((u, i) => ({ rank: i + 1, ...u }))
  }

  /** Territory count ranking (the kingdom ranking). */
  async territories(limit = 50) {
    const grouped = await this.prisma.territory.groupBy({
      by: ["ownerId"],
      where: { ownerId: { not: null } },
      _count: { _all: true },
      _sum: { areaSqM: true },
      orderBy: { _count: { ownerId: "desc" } },
      take: limit,
    })
    const ids = grouped.map((g) => g.ownerId).filter((id): id is string => !!id)
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: USER_SELECT,
    })
    const byId = new Map(users.map((u) => [u.id, u]))
    return grouped
      .filter((g) => g.ownerId && byId.has(g.ownerId))
      .map((g, i) => ({
        rank: i + 1,
        territories: g._count._all,
        areaSqM: Math.round(g._sum.areaSqM ?? 0),
        user: byId.get(g.ownerId!)!,
      }))
  }

  /** Weekly distance ranking per activity type. */
  async weeklyDistance(type?: string, limit = 50) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const grouped = await this.prisma.activity.groupBy({
      by: ["userId"],
      where: {
        startedAt: { gte: since },
        verified: true,
        ...(type ? { type: type as never } : {}),
      },
      _sum: { distanceM: true },
      orderBy: { _sum: { distanceM: "desc" } },
      take: limit,
    })
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: USER_SELECT,
    })
    const byId = new Map(users.map((u) => [u.id, u]))
    return grouped.map((g, i) => ({
      rank: i + 1,
      distanceM: Math.round(g._sum.distanceM ?? 0),
      user: byId.get(g.userId),
    }))
  }
}
