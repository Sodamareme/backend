import { PrismaService } from '../prisma/prisma.service';
import { AbsenceStatus, LearnerAttendance } from '@prisma/client';
import { LearnerScanResponse, CoachScanResponse } from './interfaces/scan-response.interface';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AttendanceService {
    private prisma;
    private notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    private isWithinScanTime;
    scan(matricule: string): Promise<LearnerScanResponse | CoachScanResponse>;
    findLearnerByMatricule(matricule: string): Promise<{
        promotion: {
            id: string;
            photoUrl: string | null;
            status: import(".prisma/client").$Enums.PromotionStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            startDate: Date;
            endDate: Date;
        };
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
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    findCoachByMatricule(matricule: string): Promise<{
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
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        photoUrl: string | null;
        qrCode: string | null;
        userId: string;
        refId: string | null;
        createdAt: Date;
        updatedAt: Date;
        matricule: string;
    }>;
    scanLearner(matricule: string): Promise<LearnerScanResponse>;
    scanCoach(matricule: string): Promise<CoachScanResponse>;
    submitAbsenceJustification(attendanceId: string, justification: string, documentUrl?: string): Promise<{
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
    updateAbsenceStatus(attendanceId: string, status: AbsenceStatus, comment?: string): Promise<LearnerAttendance>;
    getLatestScans(limit?: number): Promise<{
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
    getAbsentsByReferential(date: string, referentialId: string): Promise<{
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
    getMonthlyStats(year: number, month: number): Promise<{
        days: any[];
    }>;
    getYearlyStats(year: number): Promise<{
        months: any[];
    }>;
    getWeeklyStats(year: number): Promise<{
        weeks: {
            weekNumber: number;
            present: number;
            late: number;
            absent: number;
        }[];
    }>;
    private getWeekNumber;
    getScanHistory(type: 'LEARNER' | 'COACH', startDate: Date, endDate: Date): Promise<({
        learner: {
            promotion: {
                id: string;
                photoUrl: string | null;
                status: import(".prisma/client").$Enums.PromotionStatus;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                startDate: Date;
                endDate: Date;
            };
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
    })[] | ({
        coach: {
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
            phone: string | null;
            photoUrl: string | null;
            qrCode: string | null;
            userId: string;
            refId: string | null;
            createdAt: Date;
            updatedAt: Date;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        isPresent: boolean;
        isLate: boolean;
        checkIn: Date | null;
        checkOut: Date | null;
        coachId: string;
    })[]>;
    getPromotionAttendance(promotionId: string, startDate: Date, endDate: Date): Promise<{
        date: string;
        presentCount: number;
        lateCount: number;
        absentCount: number;
    }[]>;
    markAbsentees(): Promise<void>;
    getAttendanceByLearner(learnerId: string): Promise<({
        learner: {
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
            referential: {
                name: string;
            };
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
    })[]>;
}
