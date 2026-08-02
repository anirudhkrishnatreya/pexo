import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"
import { UpdateProfileDto } from "./dto/update-profile.dto"

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  xp: true,
  level: true,
  role: true,
  privateProfile: true,
  createdAt: true,
} as const

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        _count: { select: { followers: true, following: true, activities: true, territories: true } },
      },
    })
    if (!user) throw new NotFoundException("User not found")
    const { passwordHash: _ph, ...rest } = user
    return rest
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto })
    return this.me(userId)
  }

  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        ...PUBLIC_USER_SELECT,
        badges: { include: { badge: true } },
        _count: { select: { followers: true, following: true, activities: true, territories: true } },
      },
    })
    if (!user) throw new NotFoundException("User not found")
    return user
  }

  async search(dto: PaginationDto) {
    const where = dto.q
      ? {
          OR: [
            { username: { contains: dto.q, mode: "insensitive" as const } },
            { displayName: { contains: dto.q, mode: "insensitive" as const } },
          ],
        }
      : {}
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_USER_SELECT,
        orderBy: { xp: dto.order },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.user.count({ where }),
    ])
    return paginated(items, total, dto)
  }

  async follow(followerId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } })
    if (!target) throw new NotFoundException("User not found")
    if (target.id === followerId) return { success: false, reason: "cannot follow yourself" }
    await this.prisma.follow.upsert({
      where: { followerId_followeeId: { followerId, followeeId: target.id } },
      create: { followerId, followeeId: target.id },
      update: {},
    })
    await this.prisma.notification.create({
      data: {
        userId: target.id,
        type: "FOLLOW",
        title: "New follower",
        body: "Someone started following you",
        data: { followerId },
      },
    })
    return { success: true }
  }

  async unfollow(followerId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } })
    if (!target) throw new NotFoundException("User not found")
    await this.prisma.follow.deleteMany({
      where: { followerId, followeeId: target.id },
    })
    return { success: true }
  }

  /** XP thresholds: level n requires 1000 * n^1.5 cumulative XP */
  static levelForXp(xp: number): number {
    let level = 1
    while (xp >= 1000 * Math.pow(level, 1.5)) level += 1
    return level
  }

  async awardXp(userId: string, xp: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: xp } },
    })
    const newLevel = UsersService.levelForXp(user.xp)
    if (newLevel !== user.level) {
      await this.prisma.user.update({ where: { id: userId }, data: { level: newLevel } })
    }
    return { xp: user.xp, level: newLevel }
  }
}
