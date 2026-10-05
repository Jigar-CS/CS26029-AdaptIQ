import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsOptional()
  practiceSessionId?: string;

  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsNotEmpty()
  reasonCategory: string;

  @IsString()
  @IsNotEmpty()
  studentComment: string;
}

export enum ResolveDisputeAction {
  APPROVE_STUDENT_CORRECT = 'APPROVE_STUDENT_CORRECT',
  REJECT_AI_CORRECT = 'REJECT_AI_CORRECT',
}

export class ResolveDisputeDto {
  @IsEnum(ResolveDisputeAction)
  action: ResolveDisputeAction;

  @IsString()
  @IsOptional()
  facultyRemarks?: string;

  @IsBoolean()
  @IsOptional()
  quarantineQuestion?: boolean;
}
