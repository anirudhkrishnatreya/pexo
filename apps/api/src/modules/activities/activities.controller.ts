import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { ActivitiesService } from "./activities.service"
import { CreateActivityDto } from "./dto/create-activity.dto"

@ApiTags("activities")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post()
  @ApiOperation({
    summary: "Upload a recorded activity (runs anti-cheat + territory capture evaluation)",
  })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateActivityDto) {
    return this.activities.create(user.userId, dto)
  }

  @Get("stats/weekly")
  @ApiOperation({ summary: "Current user's 7-day training summary" })
  weekly(@CurrentUser() user: JwtUser) {
    return this.activities.weeklyStats(user.userId)
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "List a user's activities (visibility-aware)" })
  listForUser(
    @CurrentUser() user: JwtUser,
    @Param("userId") userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.activities.listForUser(user.userId, userId, dto)
  }

  @Get(":id")
  @ApiOperation({ summary: "Activity detail with kudos/comment counts and capture info" })
  findOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.activities.findOne(user.userId, id)
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete own activity" })
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.activities.delete(user.userId, id)
  }
}
