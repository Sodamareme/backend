import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCoachDto } from '../dto/create-coach.dto';

@Injectable()
export class FormDataToCoachDtoPipe implements PipeTransform {
  async transform(value: any) {
    const dto = plainToClass(CreateCoachDto, value);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    
    return dto;
  }
}