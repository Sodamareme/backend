import { IsString, IsEmail, IsEnum, IsDate, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LearnerStatus } from '@prisma/client';

export class CreateTutorDto {
  @ApiProperty({ description: 'First name of the tutor' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the tutor' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Phone number of the tutor' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email address of the tutor' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Address of the tutor' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateLearnerDto {
  @ApiProperty({ description: 'First name of the learner' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the learner' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address of the learner' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the learner' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Address of the learner' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Gender of the learner' })
  @IsString()
  gender: string;

  @ApiProperty({ description: 'Birth date of the learner' })
  @Type(() => Date)
  @IsDate()
  birthDate: Date;

  @ApiProperty({ description: 'Birth place of the learner' })
  @IsString()
  birthPlace: string;

  @ApiProperty({ description: 'Promotion ID' })
  @IsString()
  promotionId: string;

  @ApiPropertyOptional({ description: 'Referential ID' })
  @IsString()
  @IsOptional()
  refId?: string;

  @ApiPropertyOptional({ description: 'Session ID (required for multi-session referentials)' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Learner status' })
  @IsEnum(LearnerStatus)
  @IsOptional()
  status?: LearnerStatus;

  @ApiProperty({ description: 'Tutor information' })
  @ValidateNested()
  @Type(() => CreateTutorDto)
  tutor: CreateTutorDto;
}