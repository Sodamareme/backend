import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReferentialsDto {
  @ApiProperty({ 
    type: [String],
    description: 'Array of referential IDs to add to the promotion'
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  referentialIds: string[];
}