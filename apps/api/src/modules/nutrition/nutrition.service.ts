import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { PaginationDto, paginated } from "../../common/dto/pagination.dto"
import { CreateFoodItemDto, LogFoodDto, LogWaterDto, LogWeightDto } from "./dto/nutrition.dto"

function dayRange(dateStr?: string) {
  const day = dateStr ? new Date(dateStr) : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

@Injectable()
export class NutritionService {
  constructor(private prisma: PrismaService) {}

  searchFood(dto: PaginationDto) {
    const where = dto.q
      ? {
          OR: [
            { name: { contains: dto.q, mode: "insensitive" as const } },
            { brand: { contains: dto.q, mode: "insensitive" as const } },
          ],
        }
      : {}
    return this.prisma.foodItem
      .findMany({ where, skip: dto.skip, take: dto.limit, orderBy: { verified: "desc" } })
      .then(async (items) => paginated(items, await this.prisma.foodItem.count({ where }), dto))
  }

  async byBarcode(barcode: string) {
    const item = await this.prisma.foodItem.findUnique({ where: { barcode } })
    if (!item) throw new NotFoundException("No food found for this barcode")
    return item
  }

  createFoodItem(dto: CreateFoodItemDto) {
    return this.prisma.foodItem.create({ data: dto })
  }

  async logFood(userId: string, dto: LogFoodDto) {
    await this.prisma.foodItem.findUniqueOrThrow({ where: { id: dto.foodItemId } }).catch(() => {
      throw new NotFoundException("Food item not found")
    })
    return this.prisma.foodLog.create({
      data: { userId, foodItemId: dto.foodItemId, meal: dto.meal, servings: dto.servings ?? 1 },
      include: { foodItem: true },
    })
  }

  logWater(userId: string, dto: LogWaterDto) {
    return this.prisma.waterLog.create({ data: { userId, amountMl: dto.amountMl } })
  }

  logWeight(userId: string, dto: LogWeightDto) {
    return this.prisma.$transaction([
      this.prisma.weightLog.create({
        data: { userId, weightKg: dto.weightKg, bodyFatPct: dto.bodyFatPct },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { weightKg: dto.weightKg } }),
    ]).then(([log]) => log)
  }

  /** Daily dashboard: consumed vs goals, water, macros per meal, BMI. */
  async dailySummary(userId: string, date?: string) {
    const { start, end } = dayRange(date)

    const [user, foodLogs, waterAgg, latestWeight] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { caloriesGoal: true, proteinGoalG: true, waterGoalMl: true, heightCm: true },
      }),
      this.prisma.foodLog.findMany({
        where: { userId, loggedAt: { gte: start, lt: end } },
        include: { foodItem: true },
      }),
      this.prisma.waterLog.aggregate({
        where: { userId, loggedAt: { gte: start, lt: end } },
        _sum: { amountMl: true },
      }),
      this.prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: "desc" } }),
    ])

    const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0 }
    const byMeal: Record<string, typeof totals & { items: number }> = {}

    for (const log of foodLogs) {
      const f = log.foodItem
      const mult = log.servings
      const add = {
        calories: f.calories * mult,
        proteinG: f.proteinG * mult,
        carbsG: f.carbsG * mult,
        fatG: f.fatG * mult,
        fiberG: f.fiberG * mult,
        sugarG: f.sugarG * mult,
      }
      for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += add[k]
      byMeal[log.meal] ??= { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, items: 0 }
      for (const k of Object.keys(add) as Array<keyof typeof add>) byMeal[log.meal][k] += add[k]
      byMeal[log.meal].items += 1
    }

    const waterMl = waterAgg._sum.amountMl ?? 0
    const weightKg = latestWeight?.weightKg ?? null
    const bmi =
      weightKg && user.heightCm ? Math.round((weightKg / (user.heightCm / 100) ** 2) * 10) / 10 : null

    return {
      date: start.toISOString().slice(0, 10),
      totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v)])),
      byMeal,
      goals: {
        calories: user.caloriesGoal,
        proteinG: user.proteinGoalG,
        waterMl: user.waterGoalMl,
      },
      water: { consumedMl: waterMl, goalMl: user.waterGoalMl },
      body: { weightKg, bmi, bodyFatPct: latestWeight?.bodyFatPct ?? null },
      logs: foodLogs,
    }
  }

  async weightHistory(userId: string, dto: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.weightLog.findMany({
        where: { userId },
        orderBy: { loggedAt: dto.order },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.weightLog.count({ where: { userId } }),
    ])
    return paginated(items, total, dto)
  }
}
