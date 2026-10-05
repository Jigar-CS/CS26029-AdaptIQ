import { IsOptional, IsString, IsIn } from 'class-validator';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsString()
  division?: string;

  @IsOptional()
  @IsIn(['composite', 'assessments', 'practice'])
  type?: 'composite' | 'assessments' | 'practice';
}
