import { LearnerStatus, Gender } from '@prisma/client';
export declare class BulkCreateTutorDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address: string;
}
export declare class BulkCreateLearnerDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: string;
    birthPlace: string;
    promotionId: string;
    refId?: string;
    sessionId?: string;
    status?: LearnerStatus;
    tutorFirstName: string;
    tutorLastName: string;
    tutorPhone: string;
    tutorAddress: string;
    tutorEmail?: string;
}
export declare class BulkCreateLearnersDto {
    learners: BulkCreateLearnerDto[];
}
export declare class ValidationErrorDto {
    field: string;
    message: string;
    value?: any;
    line?: number;
}
export declare class LearnerImportResultDto {
    success: boolean;
    email: string;
    firstName?: string;
    lastName?: string;
    learnerId?: string;
    matricule?: string;
    error?: string;
    warnings?: string[];
    validationErrors?: ValidationErrorDto[];
}
export declare class BulkImportSummaryDto {
    duplicateEmails: number;
    duplicatePhones: number;
    sessionCapacityWarnings: number;
    missingReferentials: number;
    invalidData: number;
}
export declare class BulkImportResponseDto {
    totalProcessed: number;
    successfulImports: number;
    failedImports: number;
    results: LearnerImportResultDto[];
    summary?: BulkImportSummaryDto;
}
