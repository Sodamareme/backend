import { IsUUID, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateGradeDto {
  @ApiProperty({ 
    description: 'ID du module', 
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'moduleId doit être un UUID valide' })
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({ 
    description: 'ID de l\'apprenant', 
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'learnerId doit être un UUID valide' })
  @IsNotEmpty()
  learnerId: string;

  @ApiProperty({ 
    description: 'Note (entre 0 et 20)', 
    minimum: 0, 
    maximum: 20,
    example: 15.5
  })
  @IsNumber({}, { message: 'La valeur doit être un nombre' })
  @Min(0, { message: 'La note ne peut pas être inférieure à 0' })
  @Max(20, { message: 'La note ne peut pas être supérieure à 20' })
  @Transform(({ value }) => parseFloat(value))
  value: number;

  @ApiPropertyOptional({ 
    description: 'Commentaire sur la note',
    example: 'Excellent travail'
  })
  @IsString()
  @IsOptional()
  comment?: string;
}