import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { MealType } from '@prisma/client';

export class SyncMealScanItemDto {
  @IsString()
  localId: string;

  @IsString()
  learnerId: string;

  @IsEnum(MealType)
  type: MealType;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  serviceDate?: string;

  @IsOptional()
  @IsDateString()
  scannedAtClient?: string;
}

export class SyncMealScansDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncMealScanItemDto)
  scans: SyncMealScanItemDto[];
}
