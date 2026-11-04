import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterStudentDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/request-otp')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    limit: 3,
    ttl: 300, // 5 minutes: max 3 requests per IP/account to prevent OTP flooding
    keyPrefix: 'auth:otp-request',
    identifier: (req) => req.body?.email || req.body?.enrollmentNumber || '',
  })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('register/verify-otp')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    limit: 5,
    ttl: 300, // 5 minutes: max 5 verification attempts per IP to prevent PIN brute-forcing
    keyPrefix: 'auth:otp-verify',
    identifier: (req) => req.body?.email || req.body?.enrollmentNumber || '',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({
    limit: 5,
    ttl: 60, // 1 minute: max 5 account creation attempts per IP
    keyPrefix: 'auth:register',
  })
  async register(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    limit: 5,
    ttl: 60, // 1 minute: max 5 failed/consecutive login attempts per IP
    keyPrefix: 'auth:login',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('courses')
  @RateLimit({
    limit: 60,
    ttl: 60,
    keyPrefix: 'auth:courses',
  })
  async getCourses() {
    return this.authService.getAvailableCourses();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @RateLimit({
    limit: 120,
    ttl: 60,
    keyPrefix: 'auth:me',
  })
  async getMe(@Request() req) {
    return req.user;
  }
}
