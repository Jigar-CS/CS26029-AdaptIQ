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
            authorizedStudent: { findUnique: jest.fn() },
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

  it('should reject email if not found in AuthorizedStudent roster', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null as any);
    jest.spyOn(prisma.authorizedStudent, 'findUnique').mockResolvedValue(null as any);

    await expect(
      service.requestOtp({ email: 'unauthorized@charusat.edu.in' }),
    ).rejects.toThrow(NotFoundException);
  });
});
