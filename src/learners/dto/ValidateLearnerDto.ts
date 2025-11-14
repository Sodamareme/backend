import { ApiProperty } from '@nestjs/swagger';
import {  IsString, IsNotEmpty,  IsOptional } from 'class-validator';
export class ValidateLearnerDto {
  @ApiProperty({ example: 'learner-uuid' })
  @IsString()
  @IsNotEmpty()
  learnerId: string;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  approved: boolean;

  @ApiProperty({ example: 'Raison du refus', required: false })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}