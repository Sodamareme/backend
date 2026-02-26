import { PrismaService } from '../prisma/prisma.service';
import { Meal } from '@prisma/client';
export declare class MealsService {
    private prisma;
    constructor(prisma: PrismaService);
    findLearnerByMatricule(matricule: string): Promise<{
        user: {
            id: string;
            email: string;
            password: string;
            role: import(".prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
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
        address: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        birthDate: Date;
        birthPlace: string;
        status: import(".prisma/client").$Enums.LearnerStatus;
        refId: string | null;
        promotionId: string;
        sessionId: string | null;
    }>;
    scanMeal(matricule: string, type: string): Promise<Meal>;
    getDailyStats(): Promise<{
        date: Date;
        breakfast: number;
        lunch: number;
        total: number;
    }>;
    getMonthlyStats(year: number, month: number): Promise<{
        year: number;
        month: number;
        dailyStats: {};
    }>;
    getLearnerMealHistory(learnerId: string): Promise<({
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
            address: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            birthDate: Date;
            birthPlace: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
            refId: string | null;
            promotionId: string;
            sessionId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        learnerId: string;
        date: Date;
    })[]>;
    getLatestScans(): Promise<({
        learner: {
            promotion: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                photoUrl: string | null;
                status: import(".prisma/client").$Enums.PromotionStatus;
                startDate: Date;
                endDate: Date;
            };
            referential: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                photoUrl: string | null;
                description: string | null;
                capacity: number;
                numberOfSessions: number;
                sessionLength: number | null;
            };
        } & {
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
            address: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            birthDate: Date;
            birthPlace: string;
            status: import(".prisma/client").$Enums.LearnerStatus;
            refId: string | null;
            promotionId: string;
            sessionId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        learnerId: string;
        date: Date;
    })[]>;
}
