import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCoachDto {
  @ApiProperty({ description: 'First name of the coach' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the coach' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address of the coach' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number of the coach' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'ID of the referential to assign the coach to',
    example: 'uuid-of-referential'
  })
  @IsUUID()
  @IsOptional()
  refId?: string;
  
}