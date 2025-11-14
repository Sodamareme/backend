import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreatePendingLearnerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  birthDate: string;

  @IsString()
  birthPlace: string;

  @IsString()
  promotionId: string;

  @IsString()
  refId: string;

  tutor?: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
  };

  photoUrl?: string;
}
