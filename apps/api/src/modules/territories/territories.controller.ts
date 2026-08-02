import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { TerritoriesService } from "./territories.service"

@ApiTags("territories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("territories")
export class TerritoriesController {
  constructor(private readonly territories: TerritoriesService) {}

  @Get()
  @ApiOperation({ summary: "Territories inside a map viewport" })
  @ApiQuery({ name: "minLat", type: Number })
  @ApiQuery({ name: "maxLat", type: Number })
  @ApiQuery({ name: "minLng", type: Number })
  @ApiQuery({ name: "maxLng", type: Number })
  inBounds(
    @Query("minLat") minLat: string,
    @Query("maxLat") maxLat: string,
    @Query("minLng") minLng: string,
    @Query("maxLng") maxLng: string,
  ) {
    return this.territories.inBounds(Number(minLat), Number(maxLat), Number(minLng), Number(maxLng))
  }

  @Get("mine")
  @ApiOperation({ summary: "Current user's kingdom (owned territories)" })
  mine(@CurrentUser() user: JwtUser) {
    return this.territories.listForUser(user.userId)
  }

  @Get(":id")
  @ApiOperation({ summary: "Territory detail with capture history" })
  findOne(@Param("id") id: string) {
    return this.territories.findOne(id)
  }
}
