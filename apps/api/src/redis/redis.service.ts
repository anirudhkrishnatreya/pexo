import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import Redis from "ioredis"

/**
 * Thin Redis wrapper used for:
 * - leaderboards (sorted sets)
 * - caching hot feed pages
 * - refresh-token/session bookkeeping
 *
 * Falls back to lazy connection so unit tests can run without Redis.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  readonly client: Redis

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    })
    this.client.on("error", (err) => this.logger.warn(`Redis: ${err.message}`))
  }

  async zIncrLeaderboard(board: string, userId: string, delta: number) {
    try {
      await this.client.zincrby(`lb:${board}`, delta, userId)
    } catch {
      /* leaderboard updates are best-effort; Postgres remains source of truth */
    }
  }

  async zTop(board: string, limit = 50): Promise<Array<{ userId: string; score: number }>> {
    try {
      const raw = await this.client.zrevrange(`lb:${board}`, 0, limit - 1, "WITHSCORES")
      const out: Array<{ userId: string; score: number }> = []
      for (let i = 0; i < raw.length; i += 2) {
        out.push({ userId: raw[i], score: Number(raw[i + 1]) })
      }
      return out
    } catch {
      return []
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined)
  }
}
