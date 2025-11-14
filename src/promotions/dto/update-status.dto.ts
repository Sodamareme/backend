import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PromotionStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    enum: PromotionStatus,
    description: 'New status for the promotion'
  })
  @IsEnum(PromotionStatus)
  status: PromotionStatus;
}