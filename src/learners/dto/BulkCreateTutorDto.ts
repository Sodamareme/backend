import {
  IsArray,
  ValidateNested,
  IsDateString,
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearnerStatus, Gender } from '@prisma/client';

export class BulkCreateTutorDto {
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

  @ApiProperty({ description: 'Address of the tutor' })
  @IsString()
  address: string;
}

export class BulkCreateLearnerDto {
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

  @ApiProperty({ enum: Gender, description: 'Gender of the learner' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: 'Birth date of the learner' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ description: 'Birth place of the learner' })
  @IsString()
  birthPlace: string;

  @ApiProperty({ description: 'Promotion ID' })
  @IsString()
  promotionId: string;

  @ApiPropertyOptional({ description: 'Referential ID' })
  @IsOptional()
  @IsString()
  refId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ enum: LearnerStatus, description: 'Status of the learner' })
  @IsOptional()
  @IsEnum(LearnerStatus)
  status?: LearnerStatus;

  @ApiProperty({ description: 'Tutor first name' })
  @IsString()
  tutorFirstName: string;

  @ApiProperty({ description: 'Tutor last name' })
  @IsString()
  tutorLastName: string;

  @ApiProperty({ description: 'Tutor phone number' })
  @IsString()
  tutorPhone: string;

  @ApiProperty({ description: 'Tutor address' })
  @IsString()
  tutorAddress: string;

  @ApiPropertyOptional({ description: 'Tutor email' })
  @IsOptional()
  @IsEmail()
  tutorEmail?: string;
}

export class BulkCreateLearnersDto {
  @ApiProperty({ type: [BulkCreateLearnerDto], description: 'Array of learners to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateLearnerDto)
  learners: BulkCreateLearnerDto[];
}

export class ValidationErrorDto {
  @ApiProperty({ description: 'Field that has the error' })
  field: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Invalid value' })
  value?: any;

  @ApiPropertyOptional({ description: 'Line number in file (if applicable)' })
  line?: number;
}

export class LearnerImportResultDto {
  @ApiProperty({ description: 'Whether the import was successful' })
  success: boolean;

  @ApiProperty({ description: 'Email of the learner' })
  email: string;

  @ApiPropertyOptional({ description: 'First name of the learner' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the learner' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Generated learner ID' })
  learnerId?: string;

  @ApiPropertyOptional({ description: 'Generated matricule' })
  matricule?: string;

  @ApiPropertyOptional({ description: 'Error message if import failed' })
  error?: string;

  @ApiPropertyOptional({ type: [String], description: 'Warning messages' })
  warnings?: string[];

  @ApiPropertyOptional({
    type: [ValidationErrorDto],
    description: 'Validation errors if any',
  })
  validationErrors?: ValidationErrorDto[];
}

export class BulkImportSummaryDto {
  @ApiProperty({ description: 'Number of duplicate emails found' })
  duplicateEmails: number;

  @ApiProperty({ description: 'Number of duplicate phones found' })
  duplicatePhones: number;

  @ApiProperty({ description: 'Number of session capacity warnings' })
  sessionCapacityWarnings: number;

  @ApiProperty({ description: 'Number of missing referentials' })
  missingReferentials: number;

  @ApiProperty({ description: 'Number of invalid data entries' })
  invalidData: number;
}

export class BulkImportResponseDto {
  @ApiProperty({ description: 'Total number of records processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Number of successful imports' })
  successfulImports: number;

  @ApiProperty({ description: 'Number of failed imports' })
  failedImports: number;

  @ApiProperty({
    type: [LearnerImportResultDto],
    description: 'Detailed results for each record',
  })
  results: LearnerImportResultDto[];

  @ApiPropertyOptional({ type: BulkImportSummaryDto, description: 'Summary statistics' })
  summary?: BulkImportSummaryDto;
}
