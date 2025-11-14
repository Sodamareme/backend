
// src/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}