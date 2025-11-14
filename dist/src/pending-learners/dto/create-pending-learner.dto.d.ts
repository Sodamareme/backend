import { Gender } from '@prisma/client';
export declare class CreatePendingLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: string;
    birthPlace: string;
    promotionId: string;
    refId: string;
    tutor?: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        address?: string;
    };
    photoUrl?: string;
}
