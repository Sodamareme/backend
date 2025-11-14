import { IsString, IsEmail, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVigilDto {
  @ApiProperty({ description: 'First name of the vigil' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ description: 'Last name of the vigil' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone number of the vigil' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({ description: 'Email address of the vigil' })
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}