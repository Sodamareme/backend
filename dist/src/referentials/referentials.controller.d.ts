import { ReferentialsService } from './referentials.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateReferentialDto } from './dto/create-referential.dto';
export declare class ReferentialsController {
    private readonly referentialsService;
    private readonly cloudinaryService;
    private readonly logger;
    constructor(referentialsService: ReferentialsService, cloudinaryService: CloudinaryService);
    create(formData: any, photoFile?: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }>;
    assignToPromotion(data: {
        referentialIds: string[];
        promotionId: string;
    }): Promise<{
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
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }[]>;
    findAllReferentials(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }[]>;
    findOne(id: string): Promise<import("./interfaces/referential.interface").ReferentialWithRelations>;
    getStatistics(id: string): Promise<import("./interfaces/referential-stats.interface").ReferentialStats>;
    update(id: string, data: Partial<CreateReferentialDto>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        photoUrl: string | null;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }>;
}
