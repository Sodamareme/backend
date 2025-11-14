import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AbsenceStatus } from '@prisma/client';

export class UpdateAbsenceStatusDto {
  @ApiProperty({ 
    enum: AbsenceStatus,
    description: 'Status of the absence justification',
    example: 'PENDING'
  })
  @IsEnum(AbsenceStatus)
  status: AbsenceStatus;

  @ApiProperty({ 
    required: false,
    description: 'Optional comment for the status update'
  })
  @IsString()
  @IsOptional()
  comment?: string;
}