import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, dto: PaginationDto) {
    const where = { userId }
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return { ...paginated(items, total, dto), unread }
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { success: true }
  }

  async registerDevice(userId: string, platform: string, pushToken: string, model?: string) {
    return this.prisma.device.create({
      data: { userId, platform, pushToken, model },
    })
  }
}
