import { PartialType } from '@nestjs/swagger';
import { CreateCoachDto } from './create-coach.dto';
import { IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateCoachDto extends PartialType(CreateCoachDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter(v => v && v !== '');
    if (value && value !== '') return [value];
    return [];
  })
  refIds?: string[];
}