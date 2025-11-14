import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Vigil } from '@prisma/client';
import { CreateVigilDto } from './dto/create-vigil.dto';
export declare class VigilsService {
    private prisma;
    private cloudinary;
    private readonly logger;
    constructor(prisma: PrismaService, cloudinary: CloudinaryService);
    create(createVigilDto: CreateVigilDto, photoFile?: Express.Multer.File): Promise<Vigil>;
    findAll(): Promise<Vigil[]>;
    findOne(id: string): Promise<Vigil>;
    update(id: string, updateData: Partial<Vigil>): Promise<Vigil>;
    remove(id: string): Promise<Vigil>;
}
