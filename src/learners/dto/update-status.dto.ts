import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearnerStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ 
    enum: LearnerStatus,
    description: 'New status for the learner'
  })
  @IsEnum(LearnerStatus)
  status: LearnerStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change'
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReplaceLearnerDto {
  @ApiProperty({ description: 'ID of the active learner to be replaced' })
  @IsString()
  activeLearnerForReplacement: string;

  @ApiProperty({ description: 'ID of the waiting list learner' })
  @IsString()
  replacementLearnerId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}