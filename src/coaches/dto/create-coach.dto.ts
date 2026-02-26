import { IsString, IsEmail, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
export class CreateCoachDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => 
    (!value || value === '' || value === 'null' || value === 'undefined') 
      ? undefined 
      : value
  )
  refId?: string;
}