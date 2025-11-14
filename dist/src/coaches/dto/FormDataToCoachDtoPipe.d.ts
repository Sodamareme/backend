import { PipeTransform } from '@nestjs/common';
import { CreateCoachDto } from '../dto/create-coach.dto';
export declare class FormDataToCoachDtoPipe implements PipeTransform {
    transform(value: any): Promise<CreateCoachDto>;
}
