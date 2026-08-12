import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LearnerStatus } from '@prisma/client';
import { normalizeEmail, normalizeEmailOrUndefined } from '../../utils/email.utils';

export class CreateTutorDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => normalizeEmailOrUndefined(value))
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateLearnerDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  gender: string;

  @ApiProperty()
  @IsString()
  birthDate: string; // ← string, pas Date (multipart ne peut pas transformer)

  @ApiProperty()
  @IsString()
  birthPlace: string;

  @ApiProperty()
  @IsString()
  promotionId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsEnum(LearnerStatus)
  @IsOptional()
  status?: LearnerStatus;

  // PAS de @ValidateNested ni @Type ici — géré manuellement dans le controller
  tutor: CreateTutorDto;
}
