import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Name of the promotion' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Start date of the promotion' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'End date of the promotion' })
  @IsDateString()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Comma-separated referential IDs' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim()).filter(Boolean);
    }
    return value;
  })
  referentialIds?: string | string[];
}