import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { NotificationsService } from "./notifications.service"

class RegisterDeviceDto {
  @ApiProperty({ enum: ["ios", "android"] })
  @IsIn(["ios", "android"])
  platform: string

  @ApiProperty({ description: "FCM / APNs push token" })
  @IsString()
  @MaxLength(512)
  pushToken: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string
}

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications with unread count" })
  list(@CurrentUser() user: JwtUser, @Query() dto: PaginationDto) {
    return this.notifications.list(user.userId, dto)
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all notifications read" })
  readAll(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user.userId)
  }

  @Post("devices")
  @ApiOperation({ summary: "Register a device for push notifications" })
  registerDevice(@CurrentUser() user: JwtUser, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.userId, dto.platform, dto.pushToken, dto.model)
  }
}
