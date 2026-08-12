import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender } from '@prisma/client';
import { normalizeEmail } from '../../utils/email.utils';

export class CreatePendingLearnerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
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
  @IsOptional()
  sessionId?: string;

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
