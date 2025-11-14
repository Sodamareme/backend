
// src/auth/dto/reset-password.dto.ts
import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Token de réinitialisation',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty({ message: 'Le token est requis' })
  token: string;

  @ApiProperty({ 
    description: 'Nouveau mot de passe',
    example: 'NewPassword123!',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirmation du nouveau mot de passe',
    example: 'NewPassword123!',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @MinLength(6, { message: 'La confirmation doit contenir au moins 6 caractères' })
  confirmPassword: string;
}