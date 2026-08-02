import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { LeaderboardsService } from "./leaderboards.service"

@ApiTags("leaderboards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("leaderboards")
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  @Get("xp")
  @ApiOperation({ summary: "Global XP ranking" })
  xp() {
    return this.leaderboards.globalXp()
  }

  @Get("territories")
  @ApiOperation({ summary: "Kingdom ranking — most territories owned" })
  territories() {
    return this.leaderboards.territories()
  }

  @Get("weekly-distance")
  @ApiOperation({ summary: "Weekly distance ranking" })
  @ApiQuery({ name: "type", required: false, enum: ["RUN", "WALK", "RIDE", "SWIM", "HIKE"] })
  weeklyDistance(@Query("type") type?: string) {
    return this.leaderboards.weeklyDistance(type)
  }
}
