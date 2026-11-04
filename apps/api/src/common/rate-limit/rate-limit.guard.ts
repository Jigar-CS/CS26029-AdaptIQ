import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If route handler or controller is not decorated with @RateLimit, allow request
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Cloud proxy IP extraction (Cloudflare, Vercel, Railway, Fly, Nginx, AWS ALB)
    const clientIp = this.extractClientIp(req);

    // Build rate-limiting cache key
    const prefix = options.keyPrefix || 'default';
    let extraId = '';
    if (typeof options.identifier === 'function') {
      try {
        const customVal = options.identifier(req);
        if (customVal && typeof customVal === 'string') {
          extraId = `:${customVal.trim().toLowerCase()}`;
        }
      } catch {
        // Fallback to IP only if identifier extractor fails
      }
    }

    const rateLimitKey = `${prefix}:${clientIp}${extraId}`;

    const result = await this.rateLimitService.checkRateLimit(
      rateLimitKey,
      options.limit,
      options.ttl,
    );

    // Set standard rate limit telemetry headers
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
      res.setHeader('X-RateLimit-Reset', result.resetInSeconds.toString());
    }

    if (!result.success) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', result.resetInSeconds.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Too many attempts. For security, please wait a moment before trying again.',
          retryAfter: result.resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private extractClientIp(req: any): string {
    const cfConnectingIp = req.headers?.['cf-connecting-ip'];
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      return cfConnectingIp.trim();
    }

    const xForwardedFor = req.headers?.['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      const firstIp = xForwardedFor.split(',')[0].trim();
      if (firstIp) return firstIp;
    }

    const realIp = req.headers?.['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp.trim();
    }

    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
}

