import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService — Institutional Validation', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            authorizedStudent: {
              findUnique: jest.fn(),
              create: jest.fn().mockResolvedValue({ id: 'authed-1', name: 'Test Student' }),
              update: jest.fn().mockResolvedValue({ id: 'authed-1', name: 'Test Student' }),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock_token') },
        },
        {
          provide: 'EmailService',
          useValue: { sendOtp: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should reject non-institutional email domains during registration', async () => {
    await expect(
      service.requestOtp({ email: 'student@externaldomain.com' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should auto-provision and dispatch OTP for valid institutional student email', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null as any);
    jest.spyOn(prisma.authorizedStudent, 'findUnique').mockResolvedValue(null as any);

    const res = await service.requestOtp({ email: 'newstudent@charusat.edu.in' });
    expect(res.success).toBe(true);
    expect(res.expiresInMinutes).toBe(10);
  });
});
