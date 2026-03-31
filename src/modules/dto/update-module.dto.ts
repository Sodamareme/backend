import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateModuleDto } from './create-module.dto';

export class UpdateModuleDto extends PartialType(
  OmitType(CreateModuleDto, ['photoFile'] as const),
) {
  @ApiPropertyOptional({
    description: 'URL de la photo du module',
    example: 'https://res.cloudinary.com/demo/image/upload/module.png',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  photoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Session ID a associer au module. Envoyer une chaine vide pour deconnecter la session.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  sessionId?: string | null;
}
