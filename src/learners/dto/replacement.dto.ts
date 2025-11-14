import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LearnerStatus } from '@prisma/client';

export class ReplaceLearnerDto {
  @ApiProperty({ description: 'ID of the active learner to be replaced' })
  @IsString()
  @IsNotEmpty()
  activeLearnerForReplacement: string;

  @ApiProperty({ description: 'ID of the waiting list learner' })
  @IsString()
  @IsNotEmpty()
  replacementLearnerId: string;  // Changed from waitingLearnerId

  @ApiProperty({ description: 'Reason for replacement' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: LearnerStatus })
  @IsEnum(LearnerStatus)
  @IsNotEmpty()
  status: LearnerStatus;

  @ApiProperty({ description: 'Reason for status change' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}