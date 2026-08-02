import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  async listActive(dto: PaginationDto) {
    const now = new Date()
    const where = { startsAt: { lte: now }, endsAt: { gte: now } }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.challenge.findMany({
        where,
        orderBy: { endsAt: "asc" },
        skip: dto.skip,
        take: dto.limit,
        include: { _count: { select: { participants: true } } },
      }),
      this.prisma.challenge.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async join(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge) throw new NotFoundException("Challenge not found")
    await this.prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      create: { challengeId, userId },
      update: {},
    })
    return { success: true }
  }

  /**
   * Recompute a user's progress for all active joined challenges from their
   * activities and territory captures inside the challenge window.
   */
  async syncProgress(userId: string) {
    const now = new Date()
    const entries = await this.prisma.challengeParticipant.findMany({
      where: { userId, challenge: { startsAt: { lte: now }, endsAt: { gte: now } } },
      include: { challenge: true },
    })

    const results = []
    for (const entry of entries) {
      const { challenge } = entry
      let progress = 0

      if (challenge.metric === "territories") {
        progress = await this.prisma.territoryCapture.count({
          where: { userId, createdAt: { gte: challenge.startsAt, lte: challenge.endsAt } },
        })
      } else {
        const agg = await this.prisma.activity.aggregate({
          where: {
            userId,
            startedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
            ...(challenge.type ? { type: challenge.type } : {}),
            verified: true,
          },
          _sum: { distanceM: true, movingSec: true, elevGainM: true },
        })
        if (challenge.metric === "distance") progress = agg._sum.distanceM ?? 0
        if (challenge.metric === "duration") progress = agg._sum.movingSec ?? 0
        if (challenge.metric === "elevation") progress = agg._sum.elevGainM ?? 0
      }

      const completed = progress >= challenge.targetValue
      await this.prisma.challengeParticipant.update({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
        data: {
          progress,
          completedAt: completed && !entry.completedAt ? new Date() : entry.completedAt,
        },
      })
      if (completed && !entry.completedAt) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: "GOAL_COMPLETED",
            title: "Challenge complete!",
            body: `You finished "${challenge.title}"`,
            data: { challengeId: challenge.id },
          },
        })
      }
      results.push({ challengeId: challenge.id, progress, completed })
    }
    return results
  }

  async leaderboard(challengeId: string, dto: PaginationDto) {
    const where = { challengeId }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.challengeParticipant.findMany({
        where,
        orderBy: { progress: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
        },
      }),
      this.prisma.challengeParticipant.count({ where }),
    ])
    return paginated(items, total, dto)
  }
}
