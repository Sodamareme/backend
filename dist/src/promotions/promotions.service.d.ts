import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Promotion } from '@prisma/client';
import { CreatePromotionDto } from './dto/create-promotion.dto';
export declare class PromotionsService {
    private prisma;
    private cloudinary;
    private readonly logger;
    constructor(prisma: PrismaService, cloudinary: CloudinaryService);
    create(data: CreatePromotionDto, photoFile?: Express.Multer.File): Promise<Promotion>;
    private updateSessionDatesInBatches;
    findAll(): Promise<Promotion[]>;
    findOne(id: string): Promise<Promotion>;
    update(id: string, data: Partial<Promotion>): Promise<Promotion>;
    getActivePromotion(): Promise<Promotion>;
    getStatistics(id: string): Promise<{
        totalLearners: number;
        feminizationRate: number;
        activeModules: number;
        upcomingEvents: number;
    }>;
    addReferentials(promotionId: string, referentialIds: string[]): Promise<{
        referentials: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            photoUrl: string | null;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
        learners: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }>;
}
