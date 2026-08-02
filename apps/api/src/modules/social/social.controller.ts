import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { IsNotEmpty, IsString, MaxLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { PaginationDto } from "../../common/dto/pagination.dto"
import { SocialService } from "./social.service"

class CommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body: string
}

class MessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string
}

@ApiTags("social")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("social")
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get("feed")
  @ApiOperation({ summary: "Home activity feed (own + followed + public)" })
  feed(@CurrentUser() user: JwtUser, @Query() dto: PaginationDto) {
    return this.social.feed(user.userId, dto)
  }

  @Post("activities/:id/kudos")
  @ApiOperation({ summary: "Give kudos" })
  kudos(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.social.giveKudos(user.userId, id)
  }

  @Delete("activities/:id/kudos")
  @ApiOperation({ summary: "Remove kudos" })
  removeKudos(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.social.removeKudos(user.userId, id)
  }

  @Get("activities/:id/comments")
  @ApiOperation({ summary: "List comments on an activity" })
  comments(@Param("id") id: string, @Query() dto: PaginationDto) {
    return this.social.comments(id, dto)
  }

  @Post("activities/:id/comments")
  @ApiOperation({ summary: "Comment on an activity" })
  comment(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: CommentDto) {
    return this.social.comment(user.userId, id, dto.body)
  }

  @Delete("comments/:id")
  @ApiOperation({ summary: "Delete own comment" })
  deleteComment(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.social.deleteComment(user.userId, id)
  }

  @Post("messages/:username")
  @ApiOperation({ summary: "Send a direct message" })
  sendMessage(
    @CurrentUser() user: JwtUser,
    @Param("username") username: string,
    @Body() dto: MessageDto,
  ) {
    return this.social.sendMessage(user.userId, username, dto.body)
  }

  @Get("messages/:username")
  @ApiOperation({ summary: "Conversation with another athlete" })
  conversation(
    @CurrentUser() user: JwtUser,
    @Param("username") username: string,
    @Query() dto: PaginationDto,
  ) {
    return this.social.conversation(user.userId, username, dto)
  }
}
