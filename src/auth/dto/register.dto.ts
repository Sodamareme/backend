import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
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
