import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(128, { message: 'Password is too long.' })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/\0/g, '') : value)
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long.' })
  @MaxLength(128, { message: 'New password is too long.' })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/\0/g, '') : value)
  newPassword: string;
}
