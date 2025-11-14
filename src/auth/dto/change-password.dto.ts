// src/auth/dto/change-password.dto.ts
import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password',
    example: 'OldPassword123!',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password',
    example: 'NewPassword123!',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(6, { message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirmation of new password',
    example: 'NewPassword123!',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @MinLength(6, { message: 'La confirmation doit contenir au moins 6 caractères' })
  confirmPassword: string;
}