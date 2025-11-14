import { LearnerImportResultDto } from './BulkCreateLearnerDto';
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
    summary: BulkImportSummaryDto;
}
export declare class ValidationError {
    field: string;
    message: string;
    value?: any;
    line?: number;
}
