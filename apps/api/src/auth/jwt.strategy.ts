import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  studentId?: string;
  facultyId?: string;
  courseId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ||
        'clias_super_secure_jwt_secret_development_key_change_in_prod_987654321',
    });
  }

  /**
   * Optimised JWT validation: derives the user object entirely from the token
   * payload — no DB round-trip on every request.
   *
   * Token is short-lived (JWT_EXPIRES_IN); revocation is handled by expiry.
   * A full DB lookup only happens in places that genuinely need current DB data
   * (e.g., profile endpoint).
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Malformed authentication token.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      studentId: payload.studentId,
      facultyId: payload.facultyId,
      courseId: payload.courseId,
      // Backwards-compatible shape for controllers that access req.user.studentProfile?.id
      studentProfile: payload.studentId ? { id: payload.studentId } : null,
      facultyProfile: payload.facultyId ? { id: payload.facultyId } : null,
    };
  }
}
