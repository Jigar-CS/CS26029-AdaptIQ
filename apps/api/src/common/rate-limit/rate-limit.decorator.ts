import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_OPTIONS';

export interface RateLimitOptions {
  limit: number; // Maximum allowed requests within ttl window
  ttl: number; // Time window in seconds
  keyPrefix?: string; // Cache namespace prefix
  identifier?: (req: any) => string; // Custom identifier extractor (e.g. email, studentId)
}

/**
 * Decorator to enforce rate limiting on controllers or route handlers.
 * @example
 * @RateLimit({ limit: 5, ttl: 60, keyPrefix: 'auth:login' })
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
