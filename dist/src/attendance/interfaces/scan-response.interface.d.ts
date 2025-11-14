export interface BaseScanResponse {
    type: 'LEARNER' | 'COACH';
    scanTime: Date;
    attendanceStatus: 'PRESENT' | 'LATE' | 'ABSENT';
    isAlreadyScanned: boolean;
}
export interface LearnerScanResponse extends BaseScanResponse {
    type: 'LEARNER';
    learner: {
        id: string;
        matricule: string;
        firstName: string;
        lastName: string;
        photoUrl: string | null;
        referential: {
            name: string;
        } | null;
        promotion: {
            name: string;
        };
    };
}
export interface CoachScanResponse extends BaseScanResponse {
    type: 'COACH';
    coach: {
        id: string;
        matricule: string;
        firstName: string;
        lastName: string;
        photoUrl: string | null;
        referential: {
            name: string;
        } | null;
    };
}
export type ScanResponse = LearnerScanResponse | CoachScanResponse;
