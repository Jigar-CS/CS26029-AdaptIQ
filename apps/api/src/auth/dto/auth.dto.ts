import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RequestOtpDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address cannot be empty' })
  email: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Valid institutional role must be specified' })
  role?: UserRole;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class RegisterStudentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'A valid university email is required' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
