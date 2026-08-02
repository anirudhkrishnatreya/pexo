import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { ChallengesService } from "./challenges.service"

@ApiTags("challenges")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("challenges")
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: "Active challenges" })
  list(@Query() dto: PaginationDto) {
    return this.challenges.listActive(dto)
  }

  @Post(":id/join")
  @ApiOperation({ summary: "Join a challenge" })
  join(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.challenges.join(user.userId, id)
  }

  @Post("sync")
  @ApiOperation({ summary: "Recompute progress for joined active challenges" })
  sync(@CurrentUser() user: JwtUser) {
    return this.challenges.syncProgress(user.userId)
  }

  @Get(":id/leaderboard")
  @ApiOperation({ summary: "Challenge leaderboard" })
  leaderboard(@Param("id") id: string, @Query() dto: PaginationDto) {
    return this.challenges.leaderboard(id, dto)
  }
}
