import { AttendanceService } from './attendance.service';
import { AbsenceStatus } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CoachScanResponse, LearnerScanResponse } from './interfaces/scan-response.interface';
import { MonthlyStats } from './interfaces/attendance-stats.interface';
export declare class AttendanceController {
    private readonly attendanceService;
    private readonly cloudinaryService;
    private readonly logger;
    constructor(attendanceService: AttendanceService, cloudinaryService: CloudinaryService);
    scan(matricule: string): Promise<LearnerScanResponse | CoachScanResponse>;
    scanLearner(body: {
        matricule: string;
    }): Promise<LearnerScanResponse>;
    scanCoach(body: {
        matricule: string;
    }): Promise<CoachScanResponse>;
    submitJustification(id: string, justification: string, document?: Express.Multer.File): Promise<{
        learner: {
            id: string;
            firstName: string;
            lastName: string;
            address: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            birthDate: Date;
            birthPlace: string;
            phone: string;
            photoUrl: string | null;
            status: import(".prisma/client").$Enums.LearnerStatus;
            qrCode: string;
            userId: string;
            refId: string | null;
            promotionId: string;
            createdAt: Date;
            updatedAt: Date;
            matricule: string;
            sessionId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
        learnerId: string;
        justificationComment: string | null;
    }>;
    updateAbsenceStatus(id: string, updateStatusDto: {
        status: AbsenceStatus;
        comment?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
        learnerId: string;
        justificationComment: string | null;
    }>;
    forceApprove(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
        learnerId: string;
        justificationComment: string | null;
    }>;
    updateStatus(id: string, body: {
        status: 'present' | 'late' | 'absent';
    }): Promise<{
        learner: {
            referential: {
                id: string;
                photoUrl: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                capacity: number;
                numberOfSessions: number;
                sessionLength: number | null;
            };
        } & {
            id: string;
            firstName: string;
            lastName: string;
            address: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            birthDate: Date;
            birthPlace: string;
            phone: string;
            photoUrl: string | null;
            status: import(".prisma/client").$Enums.LearnerStatus;
            qrCode: string;
            userId: string;
            refId: string | null;
            promotionId: string;
            createdAt: Date;
            updatedAt: Date;
            matricule: string;
            sessionId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
        learnerId: string;
        justificationComment: string | null;
    }>;
    getLatestScans(): Promise<{
        learnerScans: {
            id: string;
            type: string;
            scanTime: string;
            isLate: boolean;
            attendanceStatus: string;
            learner: {
                id: string;
                firstName: string;
                lastName: string;
                photoUrl: string;
                matricule: string;
                promotion: {
                    id: string;
                    name: string;
                };
                referential: {
                    id: string;
                    name: string;
                };
            };
        }[];
        coachScans: {
            id: string;
            type: string;
            scanTime: string;
            isLate: boolean;
            attendanceStatus: string;
            coach: {
                referential: {
                    id: string;
                    name: string;
                };
                id: string;
                firstName: string;
                lastName: string;
                photoUrl: string;
                matricule: string;
                referentials: {
                    id: string;
                    name: string;
                }[];
            };
        }[];
    }>;
    getAbsentsByReferential(referentialId: string, date: string): Promise<{
        date: string;
        referentialId: string;
        totalAbsents: number;
        absents: any[];
        message: string;
    } | {
        date: string;
        referentialId: string;
        totalAbsents: number;
        absents: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photoUrl: string;
            address: string;
            referentialId: string;
            referential: {
                id: string;
                name: string;
            };
        }[];
        message?: undefined;
    }>;
    getDailyStats(date: string, referentialId?: string): Promise<{
        present: number;
        late: number;
        absent: number;
        total: number;
        attendance: ({
            id: string;
            date: string;
            scanTime: string;
            isPresent: boolean;
            isLate: boolean;
            status: import(".prisma/client").$Enums.AbsenceStatus;
            justification: string;
            documentUrl: string;
            justificationComment: string;
            learner: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                photoUrl: string;
                address: string;
                referential: {
                    id: string;
                    name: string;
                };
            };
        } | {
            id: string;
            date: string;
            scanTime: any;
            isPresent: boolean;
            isLate: boolean;
            status: "TO_JUSTIFY";
            justification: any;
            documentUrl: any;
            justificationComment: any;
            learner: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                photoUrl: string;
                address: string;
                referential: {
                    id: string;
                    name: string;
                };
            };
        })[];
    }>;
    getMonthlyStats(year: string, month: string): Promise<MonthlyStats>;
    getYearlyStats(year: string): Promise<{
        months: any[];
    }>;
    getWeeklyStats(year: string): Promise<{
        weeks: {
            weekNumber: number;
            present: number;
            late: number;
            absent: number;
        }[];
    }>;
    manualMarkAbsences(): Promise<void>;
    getPromotionAttendance(promotionId: string, startDate: string, endDate: string): Promise<{
        date: string;
        presentCount: number;
        lateCount: number;
        absentCount: number;
    }[]>;
}
