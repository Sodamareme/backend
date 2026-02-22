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
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string;
            userId: string;
            photoUrl: string | null;
            matricule: string;
            qrCode: string;
            refId: string | null;
            address: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            birthDate: Date;
            birthPlace: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
            promotionId: string;
            sessionId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        date: Date;
        learnerId: string;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
        justificationComment: string | null;
    }>;
    updateAbsenceStatus(id: string, updateStatusDto: {
        status: AbsenceStatus;
        comment?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        date: Date;
        learnerId: string;
        isPresent: boolean;
        isLate: boolean;
        scanTime: Date | null;
        justification: string | null;
        documentUrl: string | null;
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
                referential: {
                    id: string;
                    name: string;
                };
                promotion: {
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
                id: string;
                firstName: string;
                lastName: string;
                photoUrl: string;
                matricule: string;
                referential: {
                    id: string;
                    name: string;
                };
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
        attendance: {
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
        }[];
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
