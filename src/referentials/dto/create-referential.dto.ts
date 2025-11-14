import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferentialDto {
  @ApiProperty({ description: 'Name of the referential' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the referential' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'URL of the photo' })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiProperty({ description: 'Capacity of the referential' })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: 'Number of sessions (1 or 2)', minimum: 1, maximum: 2 })
  @IsNumber()
  @Min(1)
  @Max(2)
  numberOfSessions: number;

  @ApiPropertyOptional({ description: 'Length of each session in months (required if numberOfSessions > 1)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  sessionLength?: number;
}