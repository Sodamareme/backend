import { PrismaService } from '../prisma/prisma.service';
import { CreateMealScanDto } from './dto/CreateMealScanDto';
export declare class MealScansService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateMealScanDto, restaurateurId: string): Promise<{
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
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string;
            matricule: string;
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
