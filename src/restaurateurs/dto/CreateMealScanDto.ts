// dto/CreateMealScanDto.ts
import { IsString, IsEnum } from 'class-validator';

export class CreateMealScanDto {
  @IsString()
  learnerId: string;

  @IsEnum(['BREAKFAST', 'LUNCH'])
  type: 'BREAKFAST' | 'LUNCH';
}