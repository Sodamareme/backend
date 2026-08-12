// src/learners/dto/register-learner.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsEnum, IsOptional, ValidateNested, MinLength, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeEmail, normalizeEmailOrUndefined } from '../../utils/email.utils';

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

enum LearnerStatus {
  ACTIVE = 'ACTIVE',
  WAITING = 'WAITING'
}

class TutorDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+221771234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]+$/, { message: 'Format de numéro invalide' })
  phone: string;

  @ApiProperty({ example: 'tuteur@example.com', required: false })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => normalizeEmailOrUndefined(value))
  email?: string;

  @ApiProperty({ example: 'Dakar, Senegal' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  address: string;
}

export class RegisterLearnerDto {
  @ApiProperty({ example: 'Moussa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Diallo' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ example: 'moussa.diallo@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @ApiProperty({ example: '+221771234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]+$/, { message: 'Format de numéro invalide' })
  phone: string;

  @ApiProperty({ example: 'Dakar, Senegal' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  address: string;

  @ApiProperty({ enum: Gender, example: 'MALE' })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiProperty({ example: '2000-01-15' })
  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ example: 'Dakar' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  birthPlace: string;

  @ApiProperty({ example: 'promo-uuid' })
  @IsString()
  @IsNotEmpty()
  promotionId: string;

  @ApiProperty({ example: 'ref-uuid' })
  @IsString()
  @IsNotEmpty()
  refId: string;

  @ApiProperty({ enum: LearnerStatus, example: 'WAITING' })
  @IsEnum(LearnerStatus)
  @IsNotEmpty()
  status: LearnerStatus;

  @ApiProperty({ type: TutorDto })
  @ValidateNested()
  @Type(() => TutorDto)
  @IsNotEmpty()
  tutor: TutorDto;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  photo?: any;
}
