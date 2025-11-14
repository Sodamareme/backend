import { Gender, LearnerStatus } from '@prisma/client';
export declare class BulkCreateLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: Date | string;
    birthPlace: string;
    promotionId: string;
    refId?: string;
    sessionId?: string;
    status?: LearnerStatus;
    tutorFirstName: string;
    tutorLastName: string;
    tutorPhone: string;
    tutorEmail?: string;
    tutorAddress: string;
}
export declare class BulkCreateLearnersDto {
    learners: BulkCreateLearnerDto[];
}
export declare class LearnerImportResultDto {
    success: boolean;
    email: string;
    firstName: string;
    lastName: string;
    learnerId?: string;
    matricule?: string;
    error?: string;
    warnings?: string[];
}
