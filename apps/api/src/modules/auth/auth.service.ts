import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as argon2 from "argon2"
import { createHash, randomBytes } from "crypto"
import { PrismaService } from "../../prisma/prisma.service"
import { LoginDto, SignupDto } from "./dto/auth.dto"

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "900s"
const REFRESH_TTL_DAYS = 30

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    })
    if (existing) {
      throw new ConflictException("Email or username already in use")
    }

    const passwordHash = await argon2.hash(dto.password)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
      },
    })

    const tokens = await this.issueTokens(user.id, user.email, user.role)
    return { user: this.publicUser(user), ...tokens }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials")
    }
    if (user.banned) {
      throw new ForbiddenException("Account suspended")
    }
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role)
    return { user: this.publicUser(user), ...tokens }
  }

  /**
   * Rotating refresh tokens: each refresh token is single-use. The raw token
   * is never stored — only its SHA-256 hash.
   */
  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(rawToken)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token")
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role)
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return { success: true }
  }

  private async issueTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: ACCESS_TTL },
    )

    const refreshToken = randomBytes(48).toString("base64url")
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
    await this.prisma.refreshToken.create({
      data: { tokenHash: this.hash(refreshToken), userId, expiresAt },
    })

    return { accessToken, refreshToken }
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex")
  }

  private publicUser(user: { [k: string]: unknown }) {
    const { passwordHash: _ph, ...rest } = user
    return rest
  }
}
