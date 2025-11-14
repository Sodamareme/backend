import { LearnerStatus } from '@prisma/client';
export declare class ReplaceLearnerDto {
    activeLearnerForReplacement: string;
    replacementLearnerId: string;
    reason: string;
}
export declare class UpdateStatusDto {
    status: LearnerStatus;
    reason: string;
}
