import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateRestaurateurDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  email: string;
}