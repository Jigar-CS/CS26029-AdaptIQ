import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

const DISPUTE_REASON_CATEGORIES = [
  'WRONG_ANSWER',
  'AMBIGUOUS_QUESTION',
  'POOR_EXPLANATION',
  'WRONG_TOPIC_MAPPING',
  'OTHER',
] as const;

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'questionId must be a valid UUID.' })
  questionId: string;

  @IsString()
  @IsOptional()
  practiceSessionId?: string;

  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(({ value }) =>
    typeof value === 'string' && (DISPUTE_REASON_CATEGORIES as readonly string[]).includes(value)
      ? value
      : 'OTHER',
  )
  reasonCategory: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Dispute comment may not exceed 1000 characters.' })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(/<[^>]*>/g, '').replace(/\0/g, '').slice(0, 1000)
      : value,
  )
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
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(/<[^>]*>/g, '').replace(/\0/g, '').slice(0, 500)
      : value,
  )
  facultyRemarks?: string;

  @IsBoolean()
  @IsOptional()
  quarantineQuestion?: boolean;
}
