import { PromotionsService } from './promotions.service';
import { Promotion, PromotionStatus } from '@prisma/client';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { AddReferentialsDto } from './dto/add-referentials.dto';
export declare class PromotionsController {
    private readonly promotionsService;
    private readonly logger;
    constructor(promotionsService: PromotionsService);
    create(createPromotionDto: CreatePromotionDto, photo?: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }[]>;
    getActivePromotion(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }>;
    getStatistics(id: string): Promise<{
        totalLearners: number;
        feminizationRate: number;
        activeModules: number;
        upcomingEvents: number;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        startDate: Date;
        endDate: Date;
    }>;
    updateStatus(id: string, updateStatusDto: {
        status: PromotionStatus;
    }): Promise<Promotion>;
    addReferentials(id: string, dto: AddReferentialsDto): Promise<Promotion>;
}
