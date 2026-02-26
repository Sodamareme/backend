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
        name: string;
        photoUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
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
    findAll(): Promise<{
        id: string;
        name: string;
        photoUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }[]>;
    findAllReferentials(): Promise<{
        id: string;
        name: string;
        photoUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }[]>;
    findOne(id: string): Promise<import("./interfaces/referential.interface").ReferentialWithRelations>;
    getStatistics(id: string): Promise<import("./interfaces/referential-stats.interface").ReferentialStats>;
    update(id: string, data: Partial<CreateReferentialDto>): Promise<{
        id: string;
        name: string;
        photoUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        capacity: number;
        numberOfSessions: number;
        sessionLength: number | null;
    }>;
}
