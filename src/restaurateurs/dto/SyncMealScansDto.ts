import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

  @IsDateString()
  scannedAtClient: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  clientScanId?: string;

  @IsOptional()
  @IsEnum(MealType)
  detectedType?: MealType;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  manualOverrideConfirmed?: boolean;
}

export class SyncMealScansDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncMealScanItemDto)
  scans: SyncMealScanItemDto[];
}
