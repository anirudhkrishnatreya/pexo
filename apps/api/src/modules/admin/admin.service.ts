import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000)
    const [users, activities, territories, flaggedActivities, newUsers24h, activities24h] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.activity.count(),
        this.prisma.territory.count(),
        this.prisma.activity.count({ where: { verified: false } }),
        this.prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
        this.prisma.activity.count({ where: { createdAt: { gte: dayAgo } } }),
      ])
    return { users, activities, territories, flaggedActivities, newUsers24h, activities24h }
  }

  async listUsers(dto: PaginationDto) {
    const where = dto.q
      ? {
          OR: [
            { email: { contains: dto.q, mode: "insensitive" as const } },
            { username: { contains: dto.q, mode: "insensitive" as const } },
          ],
        }
      : {}
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: dto.order },
        skip: dto.skip,
        take: dto.limit,
        select: {
          id: true, email: true, username: true, displayName: true, role: true,
          banned: true, xp: true, level: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async setBanned(actorId: string, userId: string, banned: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException("User not found")
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { banned } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: banned ? "USER_BANNED" : "USER_UNBANNED",
          entity: "User",
          entityId: userId,
        },
      }),
    ])
    return { success: true, banned }
  }

  async flaggedActivities(dto: PaginationDto) {
    const where = { verified: false }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        select: {
          id: true, type: true, title: true, distanceM: true, cheatFlags: true,
          createdAt: true,
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async setFeatureFlag(actorId: string, key: string, enabled: boolean, payload?: object) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, payload },
      update: { enabled, payload },
    })
    await this.prisma.auditLog.create({
      data: { actorId, action: "FEATURE_FLAG_SET", entity: "FeatureFlag", entityId: key, meta: { enabled } },
    })
    return flag
  }

  listFeatureFlags() {
    return this.prisma.featureFlag.findMany()
  }

  async auditLogs(dto: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: { actor: { select: { id: true, username: true } } },
      }),
      this.prisma.auditLog.count(),
    ])
    return paginated(items, total, dto)
  }
}
