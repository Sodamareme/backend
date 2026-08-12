import { IsString, IsEmail, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email.utils';

export class CreateRestaurateurDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;
}
