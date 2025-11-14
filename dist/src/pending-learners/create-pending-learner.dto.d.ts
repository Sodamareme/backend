import { $Enums } from '@prisma/client';
export declare class TutorDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
}
export declare class CreatePendingLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: $Enums.Gender;
    birthDate: string;
    birthPlace: string;
    photoUrl?: string;
    promotionId: string;
    refId: string;
    tutor: TutorDto;
}
