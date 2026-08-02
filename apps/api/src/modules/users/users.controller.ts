import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { UpdateProfileDto } from "./dto/update-profile.dto"
import { UsersService } from "./users.service"

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current user's full profile" })
  me(@CurrentUser() user: JwtUser) {
    return this.users.me(user.userId)
  }

  @Patch("me")
  @ApiOperation({ summary: "Update profile, goals, and privacy settings" })
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto)
  }

  @Get()
  @ApiOperation({ summary: "Search athletes" })
  search(@Query() dto: PaginationDto) {
    return this.users.search(dto)
  }

  @Get(":username")
  @ApiOperation({ summary: "Public profile by username" })
  profile(@Param("username") username: string) {
    return this.users.getPublicProfile(username)
  }

  @Post(":username/follow")
  @ApiOperation({ summary: "Follow an athlete" })
  follow(@CurrentUser() user: JwtUser, @Param("username") username: string) {
    return this.users.follow(user.userId, username)
  }

  @Delete(":username/follow")
  @ApiOperation({ summary: "Unfollow an athlete" })
  unfollow(@CurrentUser() user: JwtUser, @Param("username") username: string) {
    return this.users.unfollow(user.userId, username)
  }
}
