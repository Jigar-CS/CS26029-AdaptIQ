import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

interface MemoryBucket {
  timestamps: number[];
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redisClient: Redis | null = null;
  private upstashLimiters: Map<string, Ratelimit> = new Map();
  private memoryStore: Map<string, MemoryBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isUpstashActive = false;

  constructor(private configService: ConfigService) {
    this.initStorage();
  }

  private initStorage() {
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL')?.trim();
    const redisToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN')?.trim();

    if (redisUrl && redisToken && !redisUrl.includes('your-database') && !redisToken.includes('your_upstash')) {
      try {
        this.redisClient = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        this.isUpstashActive = true;
        this.logger.log('🛡️ Distributed Rate Limiter active via Upstash Redis REST backend.');
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Upstash Redis: ${err?.message || err}. Falling back to in-memory sliding window.`);
        this.isUpstashActive = false;
      }
    } else {
      this.logger.log('🛡️ Rate Limiter using high-performance In-Memory sliding-window storage.');
    }

    // Run in-memory bucket cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupMemoryStore(), 5 * 60 * 1000);
  }

  /**
   * Check rate limit for a given key against limit and ttl (in seconds).
   */
  async checkRateLimit(key: string, limit: number, ttlSeconds: number): Promise<RateLimitResult> {
    if (this.isUpstashActive && this.redisClient) {
      try {
        return await this.checkUpstash(key, limit, ttlSeconds);
      } catch (err: any) {
        this.logger.warn(`Upstash query error (${err?.message}). Temporarily falling back to in-memory bucket for key: ${key}`);
        return this.checkMemory(key, limit, ttlSeconds);
      }
    }

    return this.checkMemory(key, limit, ttlSeconds);
  }

  private async checkUpstash(key: string, limit: number, ttlSeconds: number): Promise<RateLimitResult> {
    const limiterKey = `${limit}:${ttlSeconds}`;
    let limiter = this.upstashLimiters.get(limiterKey);

    if (!limiter && this.redisClient) {
      limiter = new Ratelimit({
        redis: this.redisClient,
        limiter: Ratelimit.slidingWindow(limit, `${ttlSeconds} s`),
        prefix: 'clias:rl',
      });
      this.upstashLimiters.set(limiterKey, limiter);
    }

    if (!limiter) {
      return this.checkMemory(key, limit, ttlSeconds);
    }

    const { success, limit: resLimit, remaining, reset } = await limiter.limit(key);
    const resetInSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return {
      success,
      limit: resLimit,
      remaining: Math.max(0, remaining),
      resetInSeconds,
    };
  }

  private checkMemory(key: string, limit: number, ttlSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - ttlSeconds * 1000;

    let bucket = this.memoryStore.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.memoryStore.set(key, bucket);
    }

    // Evict timestamps outside current sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    if (bucket.timestamps.length >= limit) {
      const oldestInWindow = bucket.timestamps[0];
      const resetInSeconds = Math.max(1, Math.ceil((oldestInWindow + ttlSeconds * 1000 - now) / 1000));
      return {
        success: false,
        limit,
        remaining: 0,
        resetInSeconds,
      };
    }

    bucket.timestamps.push(now);
    const resetInSeconds = ttlSeconds;

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - bucket.timestamps.length),
      resetInSeconds,
    };
  }

  private cleanupMemoryStore() {
    const now = Date.now();
    const maxRetention = 10 * 60 * 1000; // 10 minutes
    for (const [key, bucket] of this.memoryStore.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < maxRetention);
      if (bucket.timestamps.length === 0) {
        this.memoryStore.delete(key);
      }
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
