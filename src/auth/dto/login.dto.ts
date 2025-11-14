import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    description: 'Email address of the user',
    example: 'coach@example.com'
  })
  @IsEmail({}, { message: 'Email invalide' })
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