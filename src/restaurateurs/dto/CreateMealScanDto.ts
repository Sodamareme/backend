// dto/CreateMealScanDto.ts
import { IsString, IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { MealType } from '@prisma/client';

export class CreateMealScanDto {
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

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  clientScanId?: string;
}
