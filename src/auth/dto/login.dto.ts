import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email.utils';

export class LoginDto {
  @ApiProperty({ 
    description: 'Email address of the user',
    example: 'coach@example.com'
  })
  @IsEmail({}, { message: 'Email invalide' })
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @ApiProperty({ 
    description: 'Password of the user',
    example: 'Password123!',
    minLength: 6
  })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
