import { IsString, IsNotEmpty, IsDateString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({ example: 'Web Development', description: 'Name of the module' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the module' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2025-04-01T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-04-30T23:59:59.999Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Coach ID' })
  @IsUUID()
  @IsNotEmpty()
  coachId: string;

  @ApiProperty({ description: 'Referential ID' })
  @IsUUID()
  @IsNotEmpty()
  refId: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Module photo' })
  @IsOptional()
  photoFile?: Express.Multer.File;
}