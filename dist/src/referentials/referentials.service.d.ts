import { PrismaService } from '../prisma/prisma.service';
import { Referential } from '@prisma/client';
import { CreateReferentialDto } from './dto/create-referential.dto';
import { ReferentialWithRelations } from './interfaces/referential.interface';
import { ReferentialStats } from './interfaces/referential-stats.interface';
export declare class ReferentialsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateReferentialDto): Promise<Referential>;
    findAll(): Promise<Referential[]>;
    findAllReferentials(): Promise<Referential[]>;
    findOne(id: string): Promise<ReferentialWithRelations>;
    update(id: string, data: Partial<Referential>): Promise<Referential>;
    getStatistics(id: string): Promise<ReferentialStats>;
    private getSessionStatistics;
    assignToPromotion(referentialIds: string[], promotionId: string): Promise<{
        referentials: {
            id: string;
            name: string;
            photoUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            capacity: number;
            numberOfSessions: number;
            sessionLength: number | null;
        }[];
    } & {
        id: string;
        name: string;
        startDate: Date;
        endDate: Date;
        photoUrl: string | null;
        status: import(".prisma/client").$Enums.PromotionStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
