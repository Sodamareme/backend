import { LearnerImportResultDto } from './BulkCreateLearnerDto';

export class BulkImportSummaryDto {
  duplicateEmails: number;
  duplicatePhones: number;
  sessionCapacityWarnings: number;
  missingReferentials: number;
  invalidData: number;
}

export class BulkImportResponseDto {
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  results: LearnerImportResultDto[];
  summary: BulkImportSummaryDto;
}

// Pour usage interne dans le service
export class ValidationError {
  field: string;
  message: string;
  value?: any;
  line?: number;
}