import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { CreateFoodItemDto, LogFoodDto, LogWaterDto, LogWeightDto } from "./dto/nutrition.dto"
import { NutritionService } from "./nutrition.service"

@ApiTags("nutrition")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("nutrition")
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get("foods")
  @ApiOperation({ summary: "Search the nutrition database" })
  searchFood(@Query() dto: PaginationDto) {
    return this.nutrition.searchFood(dto)
  }

  @Get("foods/barcode/:barcode")
  @ApiOperation({ summary: "Barcode scanner lookup" })
  byBarcode(@Param("barcode") barcode: string) {
    return this.nutrition.byBarcode(barcode)
  }

  @Post("foods")
  @ApiOperation({ summary: "Add a custom food item" })
  createFood(@Body() dto: CreateFoodItemDto) {
    return this.nutrition.createFoodItem(dto)
  }

  @Post("log/food")
  @ApiOperation({ summary: "Log a meal entry" })
  logFood(@CurrentUser() user: JwtUser, @Body() dto: LogFoodDto) {
    return this.nutrition.logFood(user.userId, dto)
  }

  @Post("log/water")
  @ApiOperation({ summary: "Log water intake" })
  logWater(@CurrentUser() user: JwtUser, @Body() dto: LogWaterDto) {
    return this.nutrition.logWater(user.userId, dto)
  }

  @Post("log/weight")
  @ApiOperation({ summary: "Log body weight / body fat" })
  logWeight(@CurrentUser() user: JwtUser, @Body() dto: LogWeightDto) {
    return this.nutrition.logWeight(user.userId, dto)
  }

  @Get("summary")
  @ApiOperation({ summary: "Daily nutrition dashboard (macros vs goals, water, BMI)" })
  @ApiQuery({ name: "date", required: false, example: "2026-08-02" })
  summary(@CurrentUser() user: JwtUser, @Query("date") date?: string) {
    return this.nutrition.dailySummary(user.userId, date)
  }

  @Get("weight/history")
  @ApiOperation({ summary: "Weight progress history" })
  weightHistory(@CurrentUser() user: JwtUser, @Query() dto: PaginationDto) {
    return this.nutrition.weightHistory(user.userId, dto)
  }
}
