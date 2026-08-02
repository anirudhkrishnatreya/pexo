import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { PrismaModule } from "./prisma/prisma.module"
import { RedisModule } from "./redis/redis.module"
import { AuthModule } from "./modules/auth/auth.module"
import { UsersModule } from "./modules/users/users.module"
import { ActivitiesModule } from "./modules/activities/activities.module"
import { TerritoriesModule } from "./modules/territories/territories.module"
import { NutritionModule } from "./modules/nutrition/nutrition.module"
import { SocialModule } from "./modules/social/social.module"
import { ChallengesModule } from "./modules/challenges/challenges.module"
import { LeaderboardsModule } from "./modules/leaderboards/leaderboards.module"
import { NotificationsModule } from "./modules/notifications/notifications.module"
import { AdminModule } from "./modules/admin/admin.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ActivitiesModule,
    TerritoriesModule,
    NutritionModule,
    SocialModule,
    ChallengesModule,
    LeaderboardsModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
