import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { ActivityVisibility } from "@prisma/client"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  /** Home feed: public + followed athletes' activities, newest first. */
  async feed(userId: string, dto: PaginationDto) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    })
    const followeeIds = following.map((f) => f.followeeId)

    const where = {
      OR: [
        { userId, visibility: { not: ActivityVisibility.PRIVATE } },
        { userId: { in: followeeIds }, visibility: { in: [ActivityVisibility.PUBLIC, ActivityVisibility.FOLLOWERS] } },
        { visibility: ActivityVisibility.PUBLIC },
      ],
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
          capture: { select: { territoryId: true, xpAwarded: true, score: true } },
          _count: { select: { kudos: true, comments: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async giveKudos(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } })
    if (!activity) throw new NotFoundException("Activity not found")

    await this.prisma.kudos.upsert({
      where: { userId_activityId: { userId, activityId } },
      create: { userId, activityId },
      update: {},
    })

    if (activity.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: activity.userId,
          type: "KUDOS",
          title: "Kudos!",
          body: "Someone gave you kudos on your activity",
          data: { activityId },
        },
      })
    }
    return { success: true }
  }

  async removeKudos(userId: string, activityId: string) {
    await this.prisma.kudos.deleteMany({ where: { userId, activityId } })
    return { success: true }
  }

  async comment(userId: string, activityId: string, body: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } })
    if (!activity) throw new NotFoundException("Activity not found")

    const comment = await this.prisma.comment.create({
      data: { userId, activityId, body },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    })

    if (activity.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: activity.userId,
          type: "COMMENT",
          title: "New comment",
          body: body.slice(0, 120),
          data: { activityId },
        },
      })
    }
    return comment
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } })
    if (!comment) throw new NotFoundException("Comment not found")
    if (comment.userId !== userId) throw new ForbiddenException()
    await this.prisma.comment.delete({ where: { id: commentId } })
    return { success: true }
  }

  async comments(activityId: string, dto: PaginationDto) {
    const where = { activityId }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: dto.skip,
        take: dto.limit,
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.comment.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async sendMessage(senderId: string, recipientUsername: string, body: string) {
    const recipient = await this.prisma.user.findUnique({ where: { username: recipientUsername } })
    if (!recipient) throw new NotFoundException("Recipient not found")
    return this.prisma.message.create({
      data: { senderId, recipientId: recipient.id, body },
    })
  }

  async conversation(userId: string, otherUsername: string, dto: PaginationDto) {
    const other = await this.prisma.user.findUnique({ where: { username: otherUsername } })
    if (!other) throw new NotFoundException("User not found")
    const where = {
      OR: [
        { senderId: userId, recipientId: other.id },
        { senderId: other.id, recipientId: userId },
      ],
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.message.count({ where }),
    ])
    await this.prisma.message.updateMany({
      where: { senderId: other.id, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    })
    return paginated(items, total, dto)
  }
}
