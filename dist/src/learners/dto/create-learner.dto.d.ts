import { LearnerStatus } from '@prisma/client';
export declare class CreateTutorDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
}
export declare class CreateLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: string;
    birthDate: Date;
    birthPlace: string;
    promotionId: string;
    refId?: string;
    sessionId?: string;
    status?: LearnerStatus;
    tutor: CreateTutorDto;
}
