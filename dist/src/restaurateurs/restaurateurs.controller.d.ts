import { RestaurateursService } from './restaurateurs.service';
import { CreateRestaurateurDto } from './dto/create-restaurateur.dto';
export declare class RestaurateursController {
    private readonly restaurateursService;
    constructor(restaurateursService: RestaurateursService);
    create(createRestaurateurDto: CreateRestaurateurDto, photo?: Express.Multer.File): Promise<{
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
