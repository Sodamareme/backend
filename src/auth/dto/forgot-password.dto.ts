
// src/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email.utils';

export class ForgotPasswordDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Email invalide' })
  @Transform(({ value }) => normalizeEmail(value))
  email: string;
}
