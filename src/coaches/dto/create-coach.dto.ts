import { IsString, IsEmail, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email.utils';
export class CreateCoachDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
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
