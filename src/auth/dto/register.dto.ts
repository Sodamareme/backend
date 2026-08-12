import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email.utils';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'USER', required: false })
  enum: ['ADMIN', 'COACH', 'APPRENANT', 'VIGIL', 'RESTAURATEUR', 'SURVEILLANT']
  @IsOptional()
  role?: string;
}
