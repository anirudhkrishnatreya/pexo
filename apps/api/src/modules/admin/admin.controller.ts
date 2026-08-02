import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger"
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from "class-validator"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { Roles } from "../../common/decorators/roles.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { RolesGuard } from "../../common/guards/roles.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { AdminService } from "./admin.service"

class BanDto {
  @ApiProperty()
  @IsBoolean()
  banned: boolean
}

class FeatureFlagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  key: string

  @ApiProperty()
  @IsBoolean()
  enabled: boolean

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: object
}

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Platform KPIs" })
  dashboard() {
    return this.admin.dashboard()
  }

  @Get("users")
  @ApiOperation({ summary: "Search/manage users" })
  users(@Query() dto: PaginationDto) {
    return this.admin.listUsers(dto)
  }

  @Post("users/:id/ban")
  @ApiOperation({ summary: "Ban or unban a user (revokes sessions)" })
  ban(@CurrentUser() actor: JwtUser, @Param("id") id: string, @Body() dto: BanDto) {
    return this.admin.setBanned(actor.userId, id, dto.banned)
  }

  @Get("moderation/flagged-activities")
  @ApiOperation({ summary: "Activities flagged by anti-cheat" })
  flagged(@Query() dto: PaginationDto) {
    return this.admin.flaggedActivities(dto)
  }

  @Get("feature-flags")
  @ApiOperation({ summary: "List feature flags" })
  flags() {
    return this.admin.listFeatureFlags()
  }

  @Post("feature-flags")
  @ApiOperation({ summary: "Create/update a feature flag" })
  setFlag(@CurrentUser() actor: JwtUser, @Body() dto: FeatureFlagDto) {
    return this.admin.setFeatureFlag(actor.userId, dto.key, dto.enabled, dto.payload)
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Audit trail" })
  audit(@Query() dto: PaginationDto) {
    return this.admin.auditLogs(dto)
  }
}
