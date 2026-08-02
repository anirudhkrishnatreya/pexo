import { Body, Controller, Post, UseGuards } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { AuthService } from "./auth.service"
import { LoginDto, RefreshDto, SignupDto } from "./dto/auth.dto"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("signup")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Create an account with email + password" })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto)
  }

  @Post("login")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Login with email + password" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Post("refresh")
  @ApiOperation({ summary: "Exchange a refresh token for a new token pair (rotating)" })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke all active refresh tokens for the current user" })
  logout(@CurrentUser() user: JwtUser) {
    return this.auth.logout(user.userId)
  }
}
