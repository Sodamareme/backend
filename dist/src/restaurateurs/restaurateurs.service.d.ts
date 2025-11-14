import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Restaurateur } from '@prisma/client';
import { CreateRestaurateurDto } from './dto/create-restaurateur.dto';
export declare class RestaurateursService {
    private prisma;
    private cloudinary;
    private readonly logger;
    constructor(prisma: PrismaService, cloudinary: CloudinaryService);
    create(createRestaurateurDto: CreateRestaurateurDto, photoFile?: Express.Multer.File): Promise<Restaurateur>;
    findAll(): Promise<Restaurateur[]>;
    findOne(id: string): Promise<Restaurateur>;
    update(id: string, updateData: Partial<Restaurateur>): Promise<Restaurateur>;
    remove(id: string): Promise<Restaurateur>;
}
