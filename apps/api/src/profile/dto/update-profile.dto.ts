import {
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  IsNumber,
  MaxLength,
  MinLength,
  IsUrl,
  Matches,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * UpdateProfileDto — validates and sanitizes all user-submitted profile fields.
 * Uses class-validator decorators for declarative validation.
 * Transform decorators strip whitespace and dangerous characters at the DTO level
 * so downstream service code never receives raw unsanitized strings.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '').replace(/\0/g, '') : value)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9\s\-+().]*$/, { message: 'Phone number may only contain digits, spaces, dashes, plus or parentheses.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/[^0-9\s\-+().]/g, '') : value)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '').replace(/\0/g, '') : value)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value)
  officeLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({}, { message: 'githubUrl must be a valid URL.' })
  githubUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({}, { message: 'linkedinUrl must be a valid URL.' })
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({}, { message: 'portfolioUrl must be a valid URL.' })
  portfolioUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'A maximum of 30 skills is allowed.' })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value
      .filter((s: unknown) => typeof s === 'string')
      .map((s: string) => s.trim().replace(/<[^>]*>/g, '').slice(0, 60))
      .filter((s: string) => s.length > 0);
  })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  targetRole?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  semester?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/[^A-Za-z0-9_\-]/g, '') : value)
  employeeCode?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
