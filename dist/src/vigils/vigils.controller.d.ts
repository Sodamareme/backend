import { VigilsService } from './vigils.service';
import { CreateVigilDto } from './dto/create-vigil.dto';
export declare class VigilsController {
    private readonly vigilsService;
    constructor(vigilsService: VigilsService);
    create(createVigilDto: CreateVigilDto, photo?: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
    }>;
    update(id: string, updateData: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        userId: string;
        photoUrl: string | null;
    }>;
}
