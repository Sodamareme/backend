import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateGradeDto {
  @ApiProperty({
    description: 'Note de l\'apprenant (entre 0 et 20)',
    example: 16.0,
    minimum: 0,
    maximum: 20,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'La valeur doit être un nombre' })
  @Min(0, { message: 'La note ne peut pas être inférieure à 0' })
  @Max(20, { message: 'La note ne peut pas être supérieure à 20' })
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : value)
  value?: number;

  @ApiProperty({
    description: 'Commentaire sur la note',
    example: 'Excellent travail, félicitations !',
    required: false
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
