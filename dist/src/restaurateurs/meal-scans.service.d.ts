import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
export declare class MealScansService {
    private prisma;
    constructor(prisma: PrismaService);
    private getCurrentMealType;
    create(dto: CreateMealScanDto, restaurateurUserId?: string): Promise<{
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
        restaurateur: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            userId: string;
            photoUrl: string | null;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.MealType;
        learnerId: string;
        scannedAt: Date;
        restaurateurId: string;
    }>;
    findToday(): Promise<({
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
        restaurateur: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.MealType;
        learnerId: string;
        scannedAt: Date;
        restaurateurId: string;
    })[]>;
    findByLearner(learnerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        date: Date;
        learnerId: string;
    }[]>;
    findByMatricule(learnerMatricule: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        date: Date;
        learnerId: string;
    }>;
}
